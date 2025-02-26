import {SupportedLanguage} from "../config/languages"
import {LanguageService} from "./language.service"
import logger from "../utils/logger"
import {
	SEOMetaData,
	MetaTagContent,
	OpenGraphContent,
	TwitterCardContent,
	seoMetaDataSchema,
	translatedMetaDataSchema,
} from "../schemas/meta.schema"

export class MetaTagService {
	private static instance: MetaTagService
	private languageService: LanguageService

	private constructor(language: SupportedLanguage) {
		this.languageService = LanguageService.getInstance(language)
	}

	public static getInstance(language: SupportedLanguage): MetaTagService {
		if (!MetaTagService.instance) {
			MetaTagService.instance = new MetaTagService(language)
		}
		return MetaTagService.instance
	}

	/**
	 * Generate meta tags for a page or content
	 */
	public generateMetaTags(content: Record<SupportedLanguage, SEOMetaData>): SEOMetaData {
		try {
			// Validate input content
			const validationResult = translatedMetaDataSchema.safeParse({translations: content})
			if (!validationResult.success) {
				throw new Error(`Invalid meta tag content: ${validationResult.error.message}`)
			}

			// Get content for current language
			return this.languageService.getContent(content)
		} catch (error) {
			logger.error("Error generating meta tags:", error)
			throw new Error("Failed to generate meta tags")
		}
	}

	/**
	 * Validate meta tag content
	 */
	public validateMetaTags(content: SEOMetaData): {isValid: boolean; errors: string[]} {
		try {
			const result = seoMetaDataSchema.safeParse(content)
			if (!result.success) {
				return {
					isValid: false,
					errors: result.error.errors.map((err) => err.message),
				}
			}
			return {
				isValid: true,
				errors: [],
			}
		} catch (error) {
			logger.error("Error validating meta tags:", error)
			return {
				isValid: false,
				errors: ["Failed to validate meta tags"],
			}
		}
	}

	/**
	 * Generate canonical URL
	 */
	public generateCanonicalUrl(baseUrl: string, path: string, language: SupportedLanguage): string {
		try {
			const url = new URL(path, baseUrl)
			// Add language path segment for non-default languages
			if (language !== LanguageService.getDefaultLanguage()) {
				url.pathname = `/${language}${url.pathname}`
			}
			return url.toString()
		} catch (error) {
			logger.error("Error generating canonical URL:", error)
			throw new Error("Failed to generate canonical URL")
		}
	}

	/**
	 * Generate structured data (schema.org)
	 */
	public generateStructuredData(type: string, data: Record<string, any>): string {
		try {
			const structuredData = {
				"@context": "https://schema.org",
				"@type": type,
				...data,
			}
			return JSON.stringify(structuredData)
		} catch (error) {
			logger.error("Error generating structured data:", error)
			throw new Error("Failed to generate structured data")
		}
	}

	/**
	 * Generate default meta tags for a given type
	 */
	public generateDefaultMetaTags(type: string, language: SupportedLanguage): SEOMetaData {
		const defaults: SEOMetaData = {
			basics: {
				title: "ScoreTrend CMS",
				description: "Sports analytics and content management platform",
			},
			openGraph: {
				title: "ScoreTrend CMS",
				description: "Sports analytics and content management platform",
				type: "website",
			},
			twitter: {
				card: "summary",
				title: "ScoreTrend CMS",
				description: "Sports analytics and content management platform",
			},
		}

		// Validate defaults
		const validation = this.validateMetaTags(defaults)
		if (!validation.isValid) {
			logger.error("Invalid default meta tags:", validation.errors)
			throw new Error("Failed to generate default meta tags")
		}

		return defaults
	}
}
