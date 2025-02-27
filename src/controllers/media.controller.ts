import {Request, Response} from "express"
import {MediaService} from "../services/media.service"
import logger from "../utils/logger"
import {UserRole} from "@prisma/client"
import FileType from "file-type"
import sharp, {Stats, ChannelStats} from "sharp"

interface ImageMetadata {
	format: string
	width: number
	height: number
	space: string
	channels: number
	depth: number
	density: number
	hasAlpha: boolean
	orientation?: number
}

interface FormatRequirements {
	minWidth: number
	maxWidth: number
	minHeight: number
	maxHeight: number
	maxSize: number
	allowedColorSpaces: string[]
	requiredChannels: number[]
	minDepth: number
}

interface ImageChannelStats {
	min: number
	max: number
	sum: number
	squaresSum: number
	mean: number
	stdev: number
	entropy: number
}

interface ImageStats {
	channels: ImageChannelStats[]
	isOpaque: boolean
}

export class MediaController {
	private mediaService: MediaService
	private readonly ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

	private readonly FORMAT_REQUIREMENTS: Record<string, FormatRequirements> = {
		"image/jpeg": {
			minWidth: 16,
			maxWidth: 8192,
			minHeight: 16,
			maxHeight: 8192,
			maxSize: 5 * 1024 * 1024, // 5MB
			allowedColorSpaces: ["srgb", "cmyk"],
			requiredChannels: [3, 4],
			minDepth: 8,
		},
		"image/png": {
			minWidth: 16,
			maxWidth: 8192,
			minHeight: 16,
			maxHeight: 8192,
			maxSize: 5 * 1024 * 1024,
			allowedColorSpaces: ["srgb"],
			requiredChannels: [3, 4],
			minDepth: 8,
		},
		"image/webp": {
			minWidth: 16,
			maxWidth: 8192,
			minHeight: 16,
			maxHeight: 8192,
			maxSize: 5 * 1024 * 1024,
			allowedColorSpaces: ["srgb"],
			requiredChannels: [3, 4],
			minDepth: 8,
		},
		"image/gif": {
			minWidth: 16,
			maxWidth: 4096,
			minHeight: 16,
			maxHeight: 4096,
			maxSize: 5 * 1024 * 1024,
			allowedColorSpaces: ["srgb"],
			requiredChannels: [3, 4],
			minDepth: 8,
		},
	}

	constructor() {
		this.mediaService = new MediaService()
	}

	/**
	 * Validate file type using both MIME type and file signature
	 */
	private async validateFileType(buffer: Buffer, mimeType: string): Promise<boolean> {
		// Check declared MIME type
		if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
			return false
		}

		// Verify file signature
		const fileType = await FileType.fromBuffer(buffer)
		if (!fileType) {
			return false
		}

		// Verify that declared MIME type matches actual file signature
		return this.ALLOWED_MIME_TYPES.includes(fileType.mime) && fileType.mime === mimeType
	}

	/**
	 * Validate image metadata and content
	 */
	private async validateImageContent(
		buffer: Buffer,
		mimeType: string
	): Promise<{isValid: boolean; error?: string; metadata?: ImageMetadata}> {
		try {
			// Get image metadata
			const metadata = await sharp(buffer).metadata()

			if (!metadata || !metadata.width || !metadata.height) {
				return {isValid: false, error: "Failed to extract image metadata"}
			}

			const requirements = this.FORMAT_REQUIREMENTS[mimeType]

			// Validate dimensions
			if (metadata.width < requirements.minWidth || metadata.width > requirements.maxWidth) {
				return {
					isValid: false,
					error: `Image width must be between ${requirements.minWidth} and ${requirements.maxWidth} pixels`,
				}
			}

			if (metadata.height < requirements.minHeight || metadata.height > requirements.maxHeight) {
				return {
					isValid: false,
					error: `Image height must be between ${requirements.minHeight} and ${requirements.maxHeight} pixels`,
				}
			}

			// Validate color space
			if (!requirements.allowedColorSpaces.includes(metadata.space || "")) {
				return {
					isValid: false,
					error: `Invalid color space. Allowed: ${requirements.allowedColorSpaces.join(", ")}`,
				}
			}

			// Validate channels
			if (!requirements.requiredChannels.includes(metadata.channels || 0)) {
				return {
					isValid: false,
					error: `Invalid color channels. Required: ${requirements.requiredChannels.join(" or ")}`,
				}
			}

			// Validate bit depth
			const depth = Number(metadata.depth || 0)
			if (depth < requirements.minDepth) {
				return {
					isValid: false,
					error: `Image bit depth must be at least ${requirements.minDepth}`,
				}
			}

			// Check for potential malicious content
			const stats = await sharp(buffer).stats()

			// Check for suspiciously uniform areas (potential steganography)
			// More lenient for small images like logos
			const channels = stats.channels
			const isSmallImage = metadata.width * metadata.height < 10000 // Less than 100x100 equivalent

			// Skip uniform area check for small images or adjust threshold based on size
			const uniformAreaThreshold = isSmallImage ? 0.01 : 0.05

			const hasUniformArea =
				!isSmallImage &&
				channels.some(
					(channel) =>
						// Only check for completely uniform channels (min === max) in larger images
						channel.min === channel.max ||
						// Use a more lenient threshold for standard deviation
						(channel.stdev < uniformAreaThreshold && channel.mean > 0.1 && channel.mean < 0.9)
				)

			if (hasUniformArea) {
				return {
					isValid: false,
					error: "Image contains suspicious uniform areas",
				}
			}

			return {
				isValid: true,
				metadata: {
					format: metadata.format || "",
					width: metadata.width,
					height: metadata.height,
					space: metadata.space || "",
					channels: metadata.channels || 0,
					depth: Number(metadata.depth || 0),
					density: metadata.density || 72,
					hasAlpha: metadata.hasAlpha || false,
					orientation: metadata.orientation,
				},
			}
		} catch (error) {
			logger.error("Error validating image content:", error)
			return {isValid: false, error: "Failed to validate image content"}
		}
	}

	/**
	 * Upload and process media file
	 */
	public async uploadMedia(req: Request, res: Response): Promise<void> {
		try {
			// Validate request
			if (!req.file) {
				res.status(400).json({error: "No file provided"})
				return
			}

			const {type} = req.body
			if (
				!type ||
				!["blog_thumbnail", "blog_cover", "section_hero", "section_content", "author_profile"].includes(type)
			) {
				res.status(400).json({error: "Invalid media type"})
				return
			}

			// Validate file type
			const isValidType = await this.validateFileType(req.file.buffer, req.file.mimetype)
			if (!isValidType) {
				res.status(400).json({
					error: "Invalid file type or corrupted file",
					details: {
						allowedTypes: this.ALLOWED_MIME_TYPES,
						providedType: req.file.mimetype,
					},
				})
				return
			}

			// Validate image content and metadata
			const validation = await this.validateImageContent(req.file.buffer, req.file.mimetype)
			if (!validation.isValid) {
				res.status(400).json({
					error: "Image validation failed",
					details: {
						reason: validation.error,
						requirements: this.FORMAT_REQUIREMENTS[req.file.mimetype],
					},
				})
				return
			}

			// Process and upload file
			const result = await this.mediaService.processAndUploadImage(
				req.file.buffer,
				type as "blog_thumbnail" | "blog_cover" | "section_hero" | "section_content",
				req.file.originalname,
				req.file.mimetype
			)

			res.json({
				...result,
				metadata: validation.metadata,
			})
		} catch (error) {
			logger.error("Error uploading media:", error)
			if (error instanceof Error) {
				if (error.message.includes("Invalid file type") || error.message.includes("exceeds maximum")) {
					res.status(400).json({
						error: error.message,
						details: {
							maxSize: this.FORMAT_REQUIREMENTS[req.file?.mimetype || ""]?.maxSize,
						},
					})
					return
				}
			}
			res.status(500).json({
				error: "Failed to process and upload media",
				details: error instanceof Error ? error.message : undefined,
			})
		}
	}

	/**
	 * Delete media file
	 */
	public async deleteMedia(req: Request, res: Response): Promise<void> {
		try {
			// Only admins can delete media
			if (req.user?.role !== UserRole.ADMIN) {
				res.status(403).json({error: "Only administrators can delete media files"})
				return
			}

			const url = req.query.url as string
			if (!url) {
				res.status(400).json({
					error: "URL parameter is required",
					details: "Provide the full Google Cloud Storage URL as a query parameter 'url'",
					example:
						"/api/v1/cms/media/delete?url=https%3A%2F%2Fstorage.googleapis.com%2Fscoretrend%2Fblog%2Fthumbnails%2Fexample.webp",
				})
				return
			}

			// Ensure the URL is properly encoded
			let encodedUrl: string
			let decodedUrl: string

			try {
				// First decode to check if it's a valid URL
				decodedUrl = decodeURIComponent(url)

				// Then encode it properly to ensure consistent format
				encodedUrl = encodeURIComponent(decodedUrl)

				// Validate the decoded URL
				if (!decodedUrl.includes("storage.googleapis.com/scoretrend/")) {
					res.status(400).json({
						error: "Invalid file URL",
						details: "URL must be a valid Google Cloud Storage URL from the ScoreTrend bucket",
						example: "https://storage.googleapis.com/scoretrend/blog/thumbnails/example.webp",
					})
					return
				}
			} catch (error) {
				res.status(400).json({
					error: "Invalid URL encoding",
					details: "The URL must be properly URL-encoded",
					example: "https%3A%2F%2Fstorage.googleapis.com%2Fscoretrend%2Fblog%2Fthumbnails%2Fexample.webp",
				})
				return
			}

			// Delete the file using the decoded URL
			await this.mediaService.deleteFile(decodedUrl)

			// Return success response with details
			res.status(200).json({
				message: "Success: File deleted successfully.",
				deleted_url: encodedUrl,
				decoded_url: decodedUrl,
				timestamp: new Date().toISOString(),
			})
		} catch (error) {
			logger.error("Error deleting media:", error)
			if (error instanceof Error) {
				if (error.message.includes("No such object")) {
					res.status(404).json({error: "File not found"})
					return
				}
				if (error.message.includes("Invalid")) {
					res.status(400).json({error: error.message})
					return
				}
			}
			res.status(500).json({error: "Failed to delete media file"})
		}
	}
}
