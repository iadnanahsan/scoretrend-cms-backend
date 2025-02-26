import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import multer from "multer"
import rateLimit from "express-rate-limit"
import {authenticate} from "../middleware/auth.middleware"
import {MediaController} from "../controllers/media.controller"
import CONFIG from "../config"
import logger from "../utils/logger"

const router = Router()
const mediaController = new MediaController()

// Configure multer for memory storage
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
		files: 1, // Allow only 1 file
	},
	fileFilter: (req, file, cb) => {
		// Only check file type here, not media type
		const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
		if (!allowedMimes.includes(file.mimetype)) {
			return cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(", ")}`))
		}
		cb(null, true)
	},
}).single("file")

// Configure rate limiting
const uploadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: CONFIG.NODE_ENV === "production" ? 100 : 1000, // 100 uploads per 15 minutes in production, 1000 in development
	message: {error: "Too many upload requests, please try again later"},
	standardHeaders: true,
	legacyHeaders: false,
})

// Helper to wrap async route handlers
const asyncHandler =
	(fn: (req: Request, res: Response) => Promise<any>): RequestHandler =>
	async (req, res, next): Promise<void> => {
		try {
			await fn(req, res)
		} catch (error) {
			next(error)
		}
	}

// Enhanced error handling middleware for media upload
const handleMediaUpload = (req: Request, res: Response, next: NextFunction) => {
	upload(req, res, (err) => {
		try {
			// Handle multer errors
			if (err instanceof multer.MulterError) {
				if (err.code === "LIMIT_FILE_SIZE") {
					return res.status(400).json({
						error: "File size exceeded",
						code: "FILE_SIZE_ERROR",
						details: {
							message: "File size must not exceed 5MB",
							maxSize: "5MB",
						},
					})
				}
				if (err.code === "LIMIT_UNEXPECTED_FILE") {
					return res.status(400).json({
						error: "Invalid form data",
						code: "VALIDATION_ERROR",
						details: {
							message: 'Use "file" as the field name for the image upload',
							example: 'FormData: { file: (binary), type: "blog_thumbnail" }',
						},
					})
				}
				return res.status(400).json({
					error: "Upload error",
					code: "VALIDATION_ERROR",
					details: {message: err.message},
				})
			}

			// Handle other errors
			if (err) {
				return res.status(400).json({
					error: "Upload error",
					code: "VALIDATION_ERROR",
					details: {message: err.message},
				})
			}

			// Check if file exists
			if (!req.file) {
				return res.status(400).json({
					error: "No file provided",
					code: "VALIDATION_ERROR",
					details: {
						message: "Image file is required",
						example: 'FormData: { file: (binary), type: "blog_thumbnail" }',
					},
				})
			}

			// Validate media type
			const {type} = req.body
			const allowedTypes = ["blog_thumbnail", "blog_cover", "section_hero", "section_content", "author_profile"]
			if (!type) {
				return res.status(400).json({
					error: "Media type required",
					code: "VALIDATION_ERROR",
					details: {
						message: "Specify the type of media being uploaded",
						allowedTypes,
						example: 'FormData: { file: (binary), type: "blog_thumbnail" }',
					},
				})
			}

			if (!allowedTypes.includes(type)) {
				return res.status(400).json({
					error: "Invalid media type",
					code: "VALIDATION_ERROR",
					details: {
						message: `Media type must be one of: ${allowedTypes.join(", ")}`,
						allowedTypes,
						providedType: type,
					},
				})
			}

			next()
		} catch (error) {
			logger.error("Unexpected error in media upload handler:", error)
			return res.status(500).json({
				error: "Upload failed",
				code: "INTERNAL_ERROR",
				details: {
					message: "An unexpected error occurred while processing the upload",
				},
			})
		}
	})
}

// Validate media URL
const validateMediaUrl = (url: string): boolean => {
	try {
		const parsedUrl = new URL(url)
		return (
			parsedUrl.hostname === "storage.googleapis.com" &&
			parsedUrl.pathname.startsWith("/scoretrend/") &&
			/\.(jpg|jpeg|png|webp|gif)$/i.test(parsedUrl.pathname)
		)
	} catch {
		return false
	}
}

// Upload media file
router.post(
	"/upload",
	authenticate as RequestHandler,
	uploadLimiter as RequestHandler,
	handleMediaUpload,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await mediaController.uploadMedia(req, res)
	})
)

// Delete media file
router.delete(
	"/delete",
	authenticate as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		const {url} = req.query

		if (!url || typeof url !== "string") {
			return res.status(400).json({
				error: "URL parameter is required",
				details: "Provide the full Google Cloud Storage URL as a query parameter 'url'",
				example:
					"/api/v1/cms/media/delete?url=https%3A%2F%2Fstorage.googleapis.com%2Fscoretrend%2Fblog%2Fthumbnails%2Fexample.webp",
			})
		}

		try {
			const decodedUrl = decodeURIComponent(url)

			if (!validateMediaUrl(decodedUrl)) {
				return res.status(400).json({
					error: "Invalid file URL",
					details:
						"URL must be a valid Google Cloud Storage URL from the ScoreTrend bucket with a supported image extension (.jpg, .jpeg, .png, .webp, .gif)",
					example: "https://storage.googleapis.com/scoretrend/blog/thumbnails/example.webp",
				})
			}

			await mediaController.deleteMedia(req, res)
		} catch (error) {
			if (error instanceof URIError) {
				return res.status(400).json({
					error: "Invalid URL encoding",
					details: "The URL must be properly URL-encoded",
					example: "https%3A%2F%2Fstorage.googleapis.com%2Fscoretrend%2Fblog%2Fthumbnails%2Fexample.webp",
				})
			}
			throw error
		}
	})
)

export default router
