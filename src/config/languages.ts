/**
 * Language configuration interface
 */
export interface LanguageConfig {
	name: string
	default?: boolean
}

/**
 * Supported languages configuration as specified in technical documentation
 */
export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
	en: {name: "English", default: true},
	it: {name: "Italian"},
	pt: {name: "Portuguese"},
	es: {name: "Spanish"},
} as const

/**
 * Type for supported language codes
 */
export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES

/**
 * Get default language
 */
export const getDefaultLanguage = (): SupportedLanguage => {
	const defaultLang = Object.entries(SUPPORTED_LANGUAGES).find(([_, config]) => config.default)?.[0]
	return (defaultLang as SupportedLanguage) || "en"
}
