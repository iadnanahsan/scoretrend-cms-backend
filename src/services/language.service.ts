import {SUPPORTED_LANGUAGES, SupportedLanguage} from "../config/languages"
import logger from "../utils/logger"

// Translation completeness interface
interface TranslationStatus {
	isComplete: boolean
	missingFields: string[]
	language: SupportedLanguage
}

// Language Strategy Interface
interface LanguageStrategy {
	getContent<T extends Record<string, any>>(content: Record<SupportedLanguage, T>): T
	getFallback(): SupportedLanguage
	validateTranslation<T extends Record<string, any>>(content: T, requiredFields: string[]): TranslationStatus
}

// Base Strategy class to share common functionality
abstract class BaseLanguageStrategy implements LanguageStrategy {
	protected abstract language: SupportedLanguage

	public getContent<T extends Record<string, any>>(content: Record<SupportedLanguage, T>): T {
		try {
			// Try to get content in requested language
			const requestedContent = content[this.language]
			if (this.isContentComplete(requestedContent)) {
				return requestedContent
			}

			// Get fallback content
			const fallbackLang = this.getFallback()
			const fallbackContent = content[fallbackLang]

			// Merge fallback content with partial content
			if (requestedContent) {
				return {
					...fallbackContent,
					...requestedContent,
				}
			}

			return fallbackContent
		} catch (error) {
			logger.error(`Error getting content for language ${this.language}:`, error)
			throw new Error(`Failed to get content for language ${this.language}`)
		}
	}

	public abstract getFallback(): SupportedLanguage

	public validateTranslation<T extends Record<string, any>>(content: T, requiredFields: string[]): TranslationStatus {
		const missingFields = requiredFields.filter((field) => !content || !content[field])
		return {
			isComplete: missingFields.length === 0,
			missingFields,
			language: this.language,
		}
	}

	protected isContentComplete<T extends Record<string, any>>(content: T | undefined): boolean {
		return !!content && Object.keys(content).length > 0
	}
}

// Concrete Strategy for English (Default)
class EnglishStrategy extends BaseLanguageStrategy {
	protected language: SupportedLanguage = "en"

	public getFallback(): SupportedLanguage {
		return "en" // English is its own fallback
	}
}

// Concrete Strategy for Italian
class ItalianStrategy extends BaseLanguageStrategy {
	protected language: SupportedLanguage = "it"

	public getFallback(): SupportedLanguage {
		return "en"
	}
}

// Concrete Strategy for Portuguese
class PortugueseStrategy extends BaseLanguageStrategy {
	protected language: SupportedLanguage = "pt"

	public getFallback(): SupportedLanguage {
		return "en"
	}
}

// Concrete Strategy for Spanish
class SpanishStrategy extends BaseLanguageStrategy {
	protected language: SupportedLanguage = "es"

	public getFallback(): SupportedLanguage {
		return "en"
	}
}

// Language Context
export class LanguageService {
	private strategy: LanguageStrategy
	private static instance: LanguageService

	private constructor(language: SupportedLanguage) {
		this.strategy = this.getStrategy(language)
	}

	public static getInstance(language: SupportedLanguage): LanguageService {
		if (!LanguageService.instance || LanguageService.instance.getCurrentLanguage() !== language) {
			LanguageService.instance = new LanguageService(language)
		}
		return LanguageService.instance
	}

	private getStrategy(language: SupportedLanguage): LanguageStrategy {
		switch (language) {
			case "it":
				return new ItalianStrategy()
			case "pt":
				return new PortugueseStrategy()
			case "es":
				return new SpanishStrategy()
			default:
				return new EnglishStrategy()
		}
	}

	public getContent<T extends Record<string, any>>(content: Record<SupportedLanguage, T>): T {
		return this.strategy.getContent(content)
	}

	public getFallbackLanguage(): SupportedLanguage {
		return this.strategy.getFallback()
	}

	public validateTranslation<T extends Record<string, any>>(content: T, requiredFields: string[]): TranslationStatus {
		return this.strategy.validateTranslation(content, requiredFields)
	}

	public getCurrentLanguage(): SupportedLanguage {
		return this.strategy instanceof EnglishStrategy
			? "en"
			: this.strategy instanceof ItalianStrategy
			? "it"
			: this.strategy instanceof PortugueseStrategy
			? "pt"
			: "es"
	}

	public static isValidLanguage(language: string): language is SupportedLanguage {
		return Object.keys(SUPPORTED_LANGUAGES).includes(language)
	}

	public static getDefaultLanguage(): SupportedLanguage {
		return "en"
	}

	public static getSupportedLanguages(): SupportedLanguage[] {
		return Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]
	}
}
