import {Request, Response, NextFunction} from "express"
import {AnyZodObject, ZodError} from "zod"
import logger from "../utils/logger"

interface ValidationError {
	field: string
	message: string
}

/**
 * Middleware for request validation using Zod schemas
 */
export const validateRequest = (schema: AnyZodObject) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Parse request data against schema
			await schema.parseAsync({
				body: req.body,
				query: req.query,
				params: req.params,
			})

			next()
		} catch (error) {
			logger.error("Validation error:", error)

			if (error instanceof ZodError) {
				// Format validation errors
				const errors: ValidationError[] = error.errors.map((err) => ({
					field: err.path.join("."),
					message: err.message,
				}))

				res.status(400).json({
					error: "Validation failed",
					code: "VALIDATION_ERROR",
					details: errors,
				})
				return
			}

			next(error)
		}
	}
}

/**
 * Middleware for UUID validation
 */
export const validateUUID = (paramName: string) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const uuid = req.params[paramName]
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

		if (!uuidRegex.test(uuid)) {
			res.status(400).json({
				error: "Invalid UUID format",
				code: "VALIDATION_ERROR",
				details: {
					field: paramName,
					message: "Must be a valid UUID",
					value: uuid,
				},
			})
			return
		}

		next()
	}
}

/**
 * Middleware for language code validation
 */
export const validateLanguage = (queryParam: string = "language") => {
	return (req: Request, res: Response, next: NextFunction) => {
		const language = req.query[queryParam] as string
		const supportedLanguages = ["en", "it", "pt", "es"]

		if (language && !supportedLanguages.includes(language)) {
			res.status(400).json({
				error: "Invalid language code",
				code: "VALIDATION_ERROR",
				details: {
					field: queryParam,
					message: `Language must be one of: ${supportedLanguages.join(", ")}`,
					value: language,
				},
			})
			return
		}

		next()
	}
}

/**
 * Middleware for pagination validation
 */
export const validatePagination = () => {
	return (req: Request, res: Response, next: NextFunction) => {
		const page = Number(req.query.page)
		const limit = Number(req.query.limit)

		const errors: ValidationError[] = []

		if (req.query.page && (isNaN(page) || page < 1)) {
			errors.push({
				field: "page",
				message: "Page must be a positive integer",
			})
		}

		if (req.query.limit && (isNaN(limit) || limit < 1 || limit > 100)) {
			errors.push({
				field: "limit",
				message: "Limit must be between 1 and 100",
			})
		}

		if (errors.length > 0) {
			res.status(400).json({
				error: "Invalid pagination parameters",
				code: "VALIDATION_ERROR",
				details: errors,
			})
			return
		}

		next()
	}
}

/**
 * Middleware for file validation
 */
export const validateFile = (options: {maxSize?: number; allowedTypes?: string[]; required?: boolean}) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const {
			maxSize = 5 * 1024 * 1024,
			allowedTypes = ["image/jpeg", "image/png", "image/webp"],
			required = true,
		} = options

		if (!req.file) {
			if (required) {
				res.status(400).json({
					error: "No file provided",
					code: "VALIDATION_ERROR",
					details: {
						field: "file",
						message: "File is required",
					},
				})
				return
			}
			next()
			return
		}

		const errors: ValidationError[] = []

		// Validate file size
		if (req.file.size > maxSize) {
			errors.push({
				field: "file",
				message: `File size must not exceed ${maxSize / 1024 / 1024}MB`,
			})
		}

		// Validate file type
		if (!allowedTypes.includes(req.file.mimetype)) {
			errors.push({
				field: "file",
				message: `File type must be one of: ${allowedTypes.join(", ")}`,
			})
		}

		if (errors.length > 0) {
			res.status(400).json({
				error: "Invalid file",
				code: "VALIDATION_ERROR",
				details: errors,
			})
			return
		}

		next()
	}
}

/**
 * Middleware for URL validation
 */
export const validateURL = (paramName: string) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			const url = decodeURIComponent(req.params[paramName])
			new URL(url)
			next()
		} catch (error) {
			res.status(400).json({
				error: "Invalid URL format",
				code: "VALIDATION_ERROR",
				details: {
					field: paramName,
					message: "Must be a valid URL",
				},
			})
		}
	}
}
