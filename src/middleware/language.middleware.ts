import {Request, Response, NextFunction} from "express"
import {LanguageService} from "../services/language.service"
import {SupportedLanguage} from "../config/languages"
import logger from "../utils/logger"
import acceptLanguage from "accept-language"

// Configure accept-language
acceptLanguage.languages(LanguageService.getSupportedLanguages())

interface LanguageRequest extends Request {
	detectedLanguage?: SupportedLanguage
}

interface TranslationRequest extends Request {
	body: {
		translations: Record<string, Record<string, any>>
	}
}

/**
 * Middleware for language detection and handling
 * Priority:
 * 1. URL parameter/query parameter (if configured)
 * 2. Accept-Language header
 * 3. Default language (English)
 */
export const detectLanguage = (
	options: {
		paramName?: string
		queryParam?: string
		urlPrefix?: boolean
	} = {}
) => {
	return async (req: LanguageRequest, res: Response, next: NextFunction) => {
		try {
			let detectedLanguage: SupportedLanguage | undefined

			// Check URL prefix if enabled
			if (options.urlPrefix) {
				const urlLang = req.path.split("/")[1]
				if (LanguageService.isValidLanguage(urlLang)) {
					detectedLanguage = urlLang
					// Remove language prefix from path
					req.url = req.url.replace(`/${urlLang}`, "")
				}
			}

			// Check URL parameter if specified
			if (!detectedLanguage && options.paramName && req.params[options.paramName]) {
				const paramLang = req.params[options.paramName]
				if (LanguageService.isValidLanguage(paramLang)) {
					detectedLanguage = paramLang
				}
			}

			// Check query parameter if specified
			if (!detectedLanguage && options.queryParam && req.query[options.queryParam]) {
				const queryLang = req.query[options.queryParam] as string
				if (LanguageService.isValidLanguage(queryLang)) {
					detectedLanguage = queryLang
				}
			}

			// Check Accept-Language header
			if (!detectedLanguage) {
				const acceptLang = req.headers["accept-language"]
				if (acceptLang) {
					const bestLang = acceptLanguage.get(acceptLang)
					if (bestLang && LanguageService.isValidLanguage(bestLang)) {
						detectedLanguage = bestLang
					}
				}
			}

			// Fallback to default language
			if (!detectedLanguage) {
				detectedLanguage = LanguageService.getDefaultLanguage()
			}

			// Attach detected language to request
			req.detectedLanguage = detectedLanguage

			// Add language information to response headers
			res.setHeader("Content-Language", detectedLanguage)

			next()
		} catch (error) {
			logger.error("Language detection error:", error)
			next(error)
		}
	}
}

/**
 * Middleware to validate translation completeness
 */
export const validateTranslationCompleteness = (requiredFields: string[]) => {
	return async (req: TranslationRequest, res: Response, next: NextFunction) => {
		try {
			const {translations} = req.body

			if (!translations) {
				res.status(400).json({
					error: "Translations are required",
					code: "VALIDATION_ERROR",
				})
				return
			}

			const validationResults = Object.entries(translations).map(([lang, content]) => {
				if (!LanguageService.isValidLanguage(lang)) {
					return {
						isComplete: false,
						missingFields: [],
						language: lang,
						error: "Invalid language code",
					}
				}

				const languageService = LanguageService.getInstance(lang as SupportedLanguage)
				return languageService.validateTranslation(content, requiredFields)
			})

			const incompleteTranslations = validationResults.filter((result) => !result.isComplete)

			if (incompleteTranslations.length > 0) {
				res.status(400).json({
					error: "Incomplete translations",
					code: "VALIDATION_ERROR",
					details: incompleteTranslations,
				})
				return
			}

			next()
		} catch (error) {
			logger.error("Translation validation error:", error)
			next(error)
		}
	}
}

// Extend Express Request interface
declare global {
	namespace Express {
		interface Request {
			detectedLanguage?: SupportedLanguage
		}
	}
}
