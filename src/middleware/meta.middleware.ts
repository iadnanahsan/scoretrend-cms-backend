import {Request, Response, NextFunction} from "express"
import {MetaTagService} from "../services/meta.service"
import {SupportedLanguage} from "../config/languages"
import {SEOMetaData} from "../schemas/meta.schema"
import logger from "../utils/logger"

interface MetaRequest extends Request {
	meta?: SEOMetaData
}

/**
 * Middleware to handle meta tag injection
 */
export const injectMetaTags = (options: {defaultType?: string; baseUrl?: string}) => {
	return async (req: MetaRequest, res: Response, next: NextFunction) => {
		try {
			// Get language from request (set by language middleware)
			const language = req.detectedLanguage || "en"

			// Initialize meta tag service
			const metaService = MetaTagService.getInstance(language as SupportedLanguage)

			// Generate default meta tags if none provided
			if (!req.meta) {
				req.meta = metaService.generateDefaultMetaTags(
					options.defaultType || "website",
					language as SupportedLanguage
				)
			}

			// Generate canonical URL if base URL provided
			if (options.baseUrl) {
				req.meta.basics.canonical_url = metaService.generateCanonicalUrl(
					options.baseUrl,
					req.originalUrl,
					language as SupportedLanguage
				)
			}

			// Validate meta tags
			const validation = metaService.validateMetaTags(req.meta)
			if (!validation.isValid) {
				logger.warn("Invalid meta tags:", validation.errors)
				// Fall back to defaults if validation fails
				req.meta = metaService.generateDefaultMetaTags(
					options.defaultType || "website",
					language as SupportedLanguage
				)
			}

			// Store meta tags in response locals for use in templates
			res.locals.meta = req.meta

			// Add meta tags to response header for API clients
			res.setHeader("X-Meta-Tags", JSON.stringify(req.meta))

			next()
		} catch (error) {
			logger.error("Error injecting meta tags:", error)
			next(error)
		}
	}
}

/**
 * Middleware to set meta tags for a request
 */
export const setMetaTags = (meta: SEOMetaData) => {
	return (req: MetaRequest, _res: Response, next: NextFunction) => {
		req.meta = meta
		next()
	}
}

// Extend Express Request interface
declare global {
	namespace Express {
		interface Request {
			meta?: SEOMetaData
		}
	}
}
