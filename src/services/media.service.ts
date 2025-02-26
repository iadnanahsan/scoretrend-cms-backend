import {Storage} from "@google-cloud/storage"
import sharp from "sharp"
import {v4 as uuidv4} from "uuid"
import logger from "../utils/logger"
import path from "path"

interface ImageDimensions {
	width: number
	height: number
}

interface ImageRequirements {
	maxWidth: number
	maxHeight: number
	maxSize: number
	quality: number
}

interface ProcessedImage {
	url: string
	dimensions: ImageDimensions
	size: number
}

export class MediaService {
	private storage: Storage
	private bucket: string
	private readonly MAX_RETRIES = 3
	private readonly RETRY_DELAY = 1000 // 1 second
	private readonly ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
	private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

	private readonly FOLDER_STRUCTURE = {
		blog: {
			thumbnail: "blog/thumbnails",
			cover: "blog/covers",
		},
		section: {
			hero: "sections/hero",
			content: "sections/content",
		},
		author: {
			profile: "authors/profiles",
		},
	}

	// Image requirements as per technical specification
	private readonly IMAGE_REQUIREMENTS = {
		blog: {
			thumbnail: {
				maxWidth: 300,
				maxHeight: 300,
				maxSize: 500 * 1024, // 500KB
				quality: 80,
			},
			cover: {
				maxWidth: 1200,
				maxHeight: 630,
				maxSize: 2 * 1024 * 1024, // 2MB
				quality: 85,
			},
		},
		section: {
			hero: {
				maxWidth: 1920,
				maxHeight: 1080,
				maxSize: 2 * 1024 * 1024, // 2MB
				quality: 85,
			},
			content: {
				maxWidth: 800,
				maxHeight: 600,
				maxSize: 1024 * 1024, // 1MB
				quality: 80,
			},
		},
		author: {
			profile: {
				maxWidth: 400,
				maxHeight: 400,
				maxSize: 1024 * 1024, // 1MB
				quality: 85,
			},
		},
	}

	constructor() {
		this.storage = new Storage({
			keyFilename: path.join(__dirname, "../config/credentials/stability-cloudops-25e77912b692.json"),
		})
		this.bucket = "scoretrend"
	}

	/**
	 * Validate file type and size
	 */
	private validateFile(buffer: Buffer, mimeType: string): void {
		// Validate mime type
		if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
			const error = `Invalid file type: ${mimeType}. Allowed types: ${this.ALLOWED_MIME_TYPES.join(", ")}`
			logger.error(error)
			throw new Error(error)
		}

		// Validate file size
		if (buffer.length > this.MAX_FILE_SIZE) {
			const error = `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
			logger.error(error)
			throw new Error(error)
		}
	}

	/**
	 * Retry operation with exponential backoff
	 */
	private async retry<T>(operation: () => Promise<T>, context: string): Promise<T> {
		let lastError: Error = new Error("Operation failed")
		for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error as Error
				const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1)
				logger.warn(`${context} attempt ${attempt} failed:`, error)
				logger.info(`Retrying in ${delay}ms...`)
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}
		logger.error(`${context} failed after ${this.MAX_RETRIES} attempts:`, lastError)
		throw lastError
	}

	/**
	 * Get folder path based on image type
	 */
	private getFolderPath(
		type: "blog_thumbnail" | "blog_cover" | "section_hero" | "section_content" | "author_profile"
	): string {
		switch (type) {
			case "blog_thumbnail":
				return this.FOLDER_STRUCTURE.blog.thumbnail
			case "blog_cover":
				return this.FOLDER_STRUCTURE.blog.cover
			case "section_hero":
				return this.FOLDER_STRUCTURE.section.hero
			case "section_content":
				return this.FOLDER_STRUCTURE.section.content
			case "author_profile":
				return this.FOLDER_STRUCTURE.author.profile
			default:
				throw new Error("Invalid image type")
		}
	}

	/**
	 * Process and upload an image
	 */
	async processAndUploadImage(
		buffer: Buffer,
		type: "blog_thumbnail" | "blog_cover" | "section_hero" | "section_content" | "author_profile",
		originalName: string,
		mimeType: string
	): Promise<ProcessedImage> {
		try {
			logger.info(`Processing image: ${originalName}, type: ${type}, size: ${buffer.length} bytes`)

			// Validate file
			this.validateFile(buffer, mimeType)

			// Get image requirements based on type
			const requirements = this.getImageRequirements(type)

			// Process image with sharp
			const processedBuffer = await this.retry(() => this.processImage(buffer, requirements), "Image processing")

			// Get processed image dimensions
			const dimensions = await this.getImageDimensions(processedBuffer)

			// Generate unique filename with folder path
			const folderPath = this.getFolderPath(type)
			const filename = this.generateUniqueFilename(originalName)
			const fullPath = `${folderPath}/${filename}`

			// Upload to Google Cloud Storage
			const url = await this.retry(() => this.uploadToStorage(processedBuffer, fullPath), "File upload")

			logger.info(`Successfully processed and uploaded image: ${url}`)
			return {
				url,
				dimensions,
				size: processedBuffer.length,
			}
		} catch (error) {
			logger.error("Error processing and uploading image:", {
				error,
				originalName,
				type,
				size: buffer.length,
				mimeType,
			})
			throw error
		}
	}

	/**
	 * Get image requirements based on type
	 */
	private getImageRequirements(type: string): ImageRequirements {
		switch (type) {
			case "blog_thumbnail":
				return this.IMAGE_REQUIREMENTS.blog.thumbnail
			case "blog_cover":
				return this.IMAGE_REQUIREMENTS.blog.cover
			case "section_hero":
				return this.IMAGE_REQUIREMENTS.section.hero
			case "section_content":
				return this.IMAGE_REQUIREMENTS.section.content
			case "author_profile":
				return this.IMAGE_REQUIREMENTS.author.profile
			default:
				throw new Error(`Invalid image type: ${type}`)
		}
	}

	/**
	 * Process image with sharp
	 */
	private async processImage(buffer: Buffer, requirements: ImageRequirements): Promise<Buffer> {
		try {
			const image = sharp(buffer)
			const metadata = await image.metadata()

			// Resize if needed
			if (metadata.width && metadata.height) {
				if (metadata.width > requirements.maxWidth || metadata.height > requirements.maxHeight) {
					image.resize(requirements.maxWidth, requirements.maxHeight, {
						fit: "inside",
						withoutEnlargement: true,
					})
				}
			}

			// Convert to WebP for better compression
			const processed = await image
				.webp({
					quality: requirements.quality,
					effort: 6, // Higher compression effort
				})
				.toBuffer()

			// Verify size
			if (processed.length > requirements.maxSize) {
				throw new Error(`Image size exceeds maximum allowed size of ${requirements.maxSize} bytes`)
			}

			return processed
		} catch (error) {
			logger.error("Error processing image:", error)
			throw new Error("Failed to process image")
		}
	}

	/**
	 * Get image dimensions
	 */
	private async getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
		try {
			const metadata = await sharp(buffer).metadata()
			return {
				width: metadata.width || 0,
				height: metadata.height || 0,
			}
		} catch (error) {
			logger.error("Error getting image dimensions:", error)
			throw new Error("Failed to get image dimensions")
		}
	}

	/**
	 * Generate unique filename
	 */
	private generateUniqueFilename(originalName: string): string {
		const ext = path.extname(originalName)
		const uuid = uuidv4()
		return `${uuid}${ext}`
	}

	/**
	 * Upload file to Google Cloud Storage
	 */
	private async uploadToStorage(buffer: Buffer, fullPath: string): Promise<string> {
		try {
			const file = this.storage.bucket(this.bucket).file(fullPath)

			// Upload file with predefined options
			await file.save(buffer, {
				metadata: {
					contentType: "image/webp",
					cacheControl: "public, max-age=31536000", // Cache for 1 year
				},
				resumable: false, // For small files, disable resumable uploads
			})

			// Return the public URL (bucket must be configured for public access)
			return `https://storage.googleapis.com/${this.bucket}/${fullPath}`
		} catch (error) {
			logger.error("Error uploading to storage:", error)
			throw new Error("Failed to upload file to storage")
		}
	}

	/**
	 * Delete file from storage with retry
	 */
	async deleteFile(url: string): Promise<void> {
		try {
			logger.info(`Deleting file: ${url}`)

			// Extract the path from the URL
			const urlPath = new URL(url).pathname
			const filePath = urlPath.split("/").slice(2).join("/") // Remove bucket name and first slash

			await this.retry(async () => {
				const bucket = this.storage.bucket(this.bucket)
				await bucket.file(filePath).delete()
			}, "File deletion")

			logger.info(`Successfully deleted file: ${url}`)
		} catch (error) {
			logger.error("Error deleting file:", {
				error,
				url,
			})
			throw error
		}
	}
}
