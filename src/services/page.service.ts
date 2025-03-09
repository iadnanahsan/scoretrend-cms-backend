import {Page, PageTranslation, PageType, Prisma, SectionType} from "@prisma/client"
import prisma from "../lib/prisma"
import {LanguageService} from "./language.service"
import {SupportedLanguage} from "../config/languages"
import {SEOData} from "../types/page.types"
import logger from "../utils/logger"

type JsonSEOData = {
	basics: {
		title: string
		description: string
		author?: string
		canonical_url?: string
	}
	openGraph: {
		title: string
		description: string
		image?: string
		type: string
	}
	twitter: {
		card: string
		title: string
		description: string
		image?: string
	}
}

interface PageContent {
	alias: string
	seo_data?: JsonSEOData
}

export interface PageTranslationData {
	alias: string
	seo_data?: any
	[key: string]: any
}

// Define fixed sections for page types
export const PAGE_FIXED_SECTIONS: Record<PageType, SectionType[] | null> = {
	ABOUT: [
		SectionType.HERO,
		SectionType.HISTORY,
		SectionType.BORN,
		SectionType.OUR_STRENGTHS, // Our strengths section
		SectionType.SPORTS_CARD,
		SectionType.DISCOVER, // Discover section
		SectionType.TEAM,
		SectionType.MISSION,
		SectionType.FUTURE, // Future vision section
		SectionType.FAQ,
	],
	HOW_IT_WORKS: [
		SectionType.HERO, // How Scoretrend Works banner
		SectionType.SCORETREND_WHAT, // What Is Scoretrend?
		SectionType.GRAPH_HOW, // How The Graph Works explanation
		SectionType.GRAPH_EXAMPLE, // Visual graph example
		SectionType.TREND_OVERVIEW, // Overview of Goal/Team Trend
		SectionType.GOAL_TREND, // Goal Trend details
		SectionType.TEAM_TREND, // Team Trend details
		SectionType.TABS_UNDER_GAMES, // Tabs Under The Games
		SectionType.EVENTS, // Events section
		SectionType.STATS_LIVE, // Stats Live section
		SectionType.LINEUP, // Lineup section
		SectionType.STANDINGS, // Standings section
		SectionType.EXPAND_EVENT, // Expand Event explanation
	],
	HOME: null, // No sections allowed, only SEO data
	CONTACT: [
		SectionType.CONTACT, // Contact form and info section
	],
	FAQ: [
		SectionType.FAQ, // FAQ content section
	],
	NEWS: [
		SectionType.TIMELINE, // News timeline
	],
	PRIVACY_POLICY: [
		SectionType.CONTENT, // Privacy policy content
	],
	COOKIE_POLICY: [
		SectionType.CONTENT, // Cookie policy content
	],
	SYSTEM: [
		SectionType.FOOTER, // Global footer component
	],
}

export class PageService {
	/**
	 * Initialize fixed pages in the system
	 */
	async initializeFixedPages(): Promise<void> {
		try {
			// Get all page types
			const pageTypes = Object.values(PageType)

			// Create each page type if it doesn't exist
			for (const type of pageTypes) {
				const existingPage = await prisma.page.findFirst({
					where: {type},
				})

				if (!existingPage) {
					await prisma.page.create({
						data: {type},
					})
					logger.info(`Created fixed page: ${type}`)
				}
			}
		} catch (error) {
			logger.error("Error initializing fixed pages:", error)
			throw new Error("Failed to initialize fixed pages")
		}
	}

	/**
	 * Get page content with translations
	 */
	async getPageContent(pageType: PageType, language: string): Promise<Page & {translations: PageTranslation[]}> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		// Get page with translations
		const page = await prisma.page.findFirst({
			where: {type: pageType},
			include: {
				translations: {
					where: {language}, // Filter translations by language
				},
				sections: {
					include: {
						translations: {
							where: {language},
						},
					},
					orderBy: {
						order_index: "asc",
					},
				},
			},
		})

		if (!page) {
			throw new Error(`Page not found: ${pageType}`)
		}

		// Return the page with filtered translations
		return page
	}

	/**
	 * Check if page alias is unique across all pages
	 */
	private async isAliasUnique(alias: string, pageId?: string, language?: string): Promise<boolean> {
		// Add detailed debug logging
		logger.debug(
			`[PageService.isAliasUnique] Checking if alias "${alias}" is unique${
				pageId ? ` (excluding pageId: ${pageId})` : ""
			}`
		)

		// Find any page translation with the same alias (case insensitive)
		const existingTranslation = await prisma.pageTranslation.findFirst({
			where: {
				alias: {
					equals: alias,
					mode: "insensitive", // Case-insensitive matching
				},
				// Exclude the current page translation if updating
				...(pageId && language
					? {
							NOT: {
								AND: [{page_id: pageId}, {language: language}],
							},
					  }
					: {}),
			},
			select: {
				id: true,
				page_id: true,
				language: true,
			},
		})

		// If we found a translation with this alias, it's not unique
		const isUnique = !existingTranslation

		logger.debug(`[PageService.isAliasUnique] Alias "${alias}" is ${isUnique ? "unique" : "not unique"}`)
		if (!isUnique) {
			logger.debug(`[PageService.isAliasUnique] Existing translation found:`, existingTranslation)
		}

		return isUnique
	}

	/**
	 * Validate and sanitize page alias
	 * - Replaces spaces with hyphens
	 * - Converts to lowercase
	 * - Ensures proper length (max 50 chars for pages)
	 * - Allows only alphanumeric, hyphens, and underscores
	 */
	private validateAlias(alias: string): string {
		if (!alias) {
			throw new Error("Alias is required")
		}

		// Replace spaces with hyphens and convert to lowercase
		let sanitizedAlias = alias.trim().replace(/\s+/g, "-").toLowerCase()

		// Remove any characters that aren't alphanumeric, hyphens, or underscores
		sanitizedAlias = sanitizedAlias.replace(/[^a-z0-9-_]/g, "")

		// Check length (max 50 chars for pages)
		const MAX_PAGE_ALIAS_LENGTH = 50
		if (sanitizedAlias.length > MAX_PAGE_ALIAS_LENGTH) {
			throw new Error(`Page alias cannot exceed ${MAX_PAGE_ALIAS_LENGTH} characters`)
		}

		// Ensure alias isn't empty after sanitization
		if (!sanitizedAlias) {
			throw new Error("Alias must contain at least one alphanumeric character")
		}

		return sanitizedAlias
	}

	/**
	 * Update page translation
	 */
	async updatePageTranslation(
		pageId: string,
		language: string,
		data: {alias: string; seo_data: JsonSEOData}
	): Promise<PageTranslation> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		try {
			// Get the page to check its type
			const page = await prisma.page.findUnique({
				where: {id: pageId},
				select: {type: true},
			})

			if (!page) {
				throw new Error("Page not found")
			}

			let sanitizedAlias

			// For HOME page type, use a placeholder value and skip validation
			if (page.type === PageType.HOME) {
				// Use a placeholder that won't be exposed to frontend
				sanitizedAlias = `home-${language}-placeholder`
				logger.debug(
					`[PageService.updatePageTranslation] Using placeholder alias for HOME page: ${sanitizedAlias}`
				)
			} else {
				// For other page types, validate and sanitize alias
				sanitizedAlias = this.validateAlias(data.alias)

				// Check if alias is unique across all pages
				const isUnique = await this.isAliasUnique(sanitizedAlias, pageId, language)
				if (!isUnique) {
					throw new Error(
						`Page alias "${sanitizedAlias}" already exists. Each page must have a unique alias.`
					)
				}
			}

			return await prisma.pageTranslation.upsert({
				where: {
					page_id_language: {
						page_id: pageId,
						language,
					},
				},
				update: {
					alias: sanitizedAlias,
					seo_data: data.seo_data as Prisma.JsonObject,
				},
				create: {
					page_id: pageId,
					language,
					alias: sanitizedAlias,
					seo_data: data.seo_data as Prisma.JsonObject,
				},
			})
		} catch (error) {
			logger.error("Error updating page translation:", error)
			if (error instanceof Error && (error.message.includes("Page alias") || error.message.includes("Alias"))) {
				throw error
			}
			throw new Error("Failed to update page translation")
		}
	}

	/**
	 * Get page SEO data
	 */
	async getPageSEO(pageId: string, language: string): Promise<SEOData & {alias: string | null}> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		// First get the page to check its type
		const page = await prisma.page.findUnique({
			where: {id: pageId},
			select: {type: true},
		})

		if (!page) {
			throw new Error("Page not found")
		}

		const translation = await prisma.pageTranslation.findUnique({
			where: {
				page_id_language: {
					page_id: pageId,
					language,
				},
			},
			select: {
				seo_data: true,
				alias: true,
			},
		})

		if (!translation) {
			throw new Error("Page translation not found")
		}

		// For HOME page type, return null for alias
		if (page.type === PageType.HOME) {
			return {
				...(translation.seo_data as unknown as SEOData),
				alias: null,
			}
		}

		// For other page types, return the alias as usual
		return {
			...(translation.seo_data as unknown as SEOData),
			alias: translation.alias,
		}
	}

	/**
	 * Update page SEO data
	 */
	async updatePageSEO(
		pageId: string,
		language: string,
		seoData: JsonSEOData,
		alias?: string
	): Promise<PageTranslation> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		try {
			// First check if page exists
			const page = await prisma.page.findUnique({
				where: {id: pageId},
			})

			if (!page) {
				throw new Error("Page not found")
			}

			// Get existing translation for alias
			const existingTranslation = await prisma.pageTranslation.findUnique({
				where: {
					page_id_language: {
						page_id: pageId,
						language,
					},
				},
				select: {alias: true},
			})

			// Handle alias if provided
			let sanitizedAlias = existingTranslation?.alias || `${page.type.toLowerCase()}-${language}`

			// For HOME page type, use a placeholder value and skip validation
			if (page.type === PageType.HOME) {
				// Use a placeholder that won't be exposed to frontend
				sanitizedAlias = `home-${language}-placeholder`
				logger.debug(`[PageService.updatePageSEO] Using placeholder alias for HOME page: ${sanitizedAlias}`)
			} else if (alias) {
				// For other page types, validate and sanitize alias if provided
				sanitizedAlias = this.validateAlias(alias)

				// Check if alias is unique across all pages
				const isUnique = await this.isAliasUnique(sanitizedAlias, pageId, language)
				if (!isUnique) {
					throw new Error(
						`Page alias "${sanitizedAlias}" already exists. Each page must have a unique alias.`
					)
				}
			}

			return await prisma.pageTranslation.upsert({
				where: {
					page_id_language: {
						page_id: pageId,
						language,
					},
				},
				update: {
					seo_data: seoData as Prisma.JsonObject,
					alias: sanitizedAlias,
				},
				create: {
					page_id: pageId,
					language,
					alias: sanitizedAlias,
					seo_data: seoData as Prisma.JsonObject,
				},
			})
		} catch (error) {
			logger.error("Error updating page SEO:", error)
			throw new Error(error instanceof Error ? error.message : "Failed to update page SEO")
		}
	}

	/**
	 * Get page by type
	 */
	async getPageByType(type: PageType): Promise<Page | null> {
		return await prisma.page.findFirst({
			where: {type},
			include: {
				translations: true,
				sections: {
					include: {
						translations: true,
					},
					orderBy: {
						order_index: "asc",
					},
				},
			},
		})
	}

	/**
	 * Initialize page sections
	 */
	async initializePageSections(
		pageId: string,
		sections: Array<{type: SectionType; order_index: number}>
	): Promise<void> {
		try {
			// Get page type first
			const page = await prisma.page.findUnique({
				where: {id: pageId},
			})

			if (!page) {
				throw new Error("Page not found")
			}

			// Check if this page type has fixed sections
			const fixedSections = PAGE_FIXED_SECTIONS[page.type]

			// If fixedSections is null, this page type doesn't support sections
			if (fixedSections === null) {
				throw new Error(`Page type ${page.type} does not support sections`)
			}

			// For pages with fixed sections, validate the sections being added
			if (fixedSections.length > 0) {
				// Validate the sections being added
				for (const section of sections) {
					if (!fixedSections.includes(section.type)) {
						throw new Error(`Section type ${section.type} is not allowed for ${page.type} page`)
					}
				}

				// Check for duplicates
				const existingSections = await prisma.section.findMany({
					where: {page_id: pageId},
				})

				for (const section of sections) {
					// Special case: Allow multiple STANDINGS sections for HOW_IT_WORKS page
					// Special case: Allow multiple TIMELINE sections for NEWS page
					if (
						(page.type === PageType.HOW_IT_WORKS && section.type === SectionType.STANDINGS) ||
						(page.type === PageType.NEWS && section.type === SectionType.TIMELINE)
					) {
						// Skip duplicate check for special cases
						continue
					}

					// For all other cases, check for duplicates
					if (existingSections.some((s) => s.type === section.type)) {
						throw new Error(`Section type ${section.type} already exists for this page`)
					}
				}
			}

			await prisma.$transaction(
				sections.map((section) =>
					prisma.section.create({
						data: {
							page_id: pageId,
							type: section.type,
							order_index: section.order_index,
						},
					})
				)
			)
		} catch (error) {
			logger.error("Error initializing page sections:", error)
			throw new Error(error instanceof Error ? error.message : "Failed to initialize page sections")
		}
	}

	/**
	 * Get page by alias
	 */
	async getPageByAlias(alias: string, language: string): Promise<Page | null> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			// Add detailed debug logging
			logger.debug(`[PageService.getPageByAlias] Looking up page with alias: ${alias} in language: ${language}`)

			// Find the page translation with the matching alias
			const pageTranslation = await prisma.pageTranslation.findFirst({
				where: {
					alias: {
						equals: alias,
						mode: "insensitive", // Case-insensitive matching
					},
					language: language,
				},
				include: {
					page: {
						include: {
							translations: {
								where: {
									language,
								},
							},
							sections: {
								include: {
									translations: {
										where: {
											language,
										},
									},
								},
								orderBy: {
									order_index: "asc",
								},
							},
						},
					},
				},
			})

			logger.debug(
				`[PageService.getPageByAlias] Database result:`,
				pageTranslation ? "Page found" : "Page not found"
			)

			if (!pageTranslation) {
				return null
			}

			return pageTranslation.page
		} catch (error) {
			logger.error("Error getting page by alias:", error)
			throw error
		}
	}

	/**
	 * Get all page aliases
	 * Returns a list of all page aliases with their corresponding page types and languages
	 * Note: HOME page type is excluded as its aliases are managed on the frontend
	 */
	async getAllAliases(): Promise<Array<{alias: string; page_type: PageType; language: string; page_id: string}>> {
		try {
			const translations = await prisma.pageTranslation.findMany({
				select: {
					alias: true,
					language: true,
					page_id: true,
					page: {
						select: {
							type: true,
						},
					},
				},
				where: {
					page: {
						type: {
							not: PageType.HOME, // Exclude HOME page type
						},
					},
				},
				orderBy: {
					language: "asc",
				},
			})

			// Format the response
			return translations.map((translation) => ({
				alias: translation.alias,
				page_type: translation.page.type,
				language: translation.language,
				page_id: translation.page_id,
			}))
		} catch (error) {
			logger.error("Error getting all page aliases:", error)
			throw new Error("Failed to get page aliases")
		}
	}

	/**
	 * Get all page aliases grouped by page
	 * Returns a list of pages with their translations grouped together
	 * Note: HOME page type is excluded as its aliases are managed on the frontend
	 */
	async getGroupedAliases(): Promise<
		Array<{
			page_id: string
			page_type: PageType
			translations: Array<{
				language: string
				alias: string
			}>
		}>
	> {
		try {
			const translations = await prisma.pageTranslation.findMany({
				select: {
					alias: true,
					language: true,
					page_id: true,
					page: {
						select: {
							type: true,
						},
					},
				},
				where: {
					page: {
						type: {
							not: PageType.HOME, // Exclude HOME page type
						},
					},
				},
				orderBy: [{page_id: "asc"}, {language: "asc"}],
			})

			// Group by page_id
			const groupedByPage = translations.reduce(
				(acc, translation) => {
					const pageId = translation.page_id

					if (!acc[pageId]) {
						acc[pageId] = {
							page_id: pageId,
							page_type: translation.page.type,
							translations: [],
						}
					}

					acc[pageId].translations.push({
						language: translation.language,
						alias: translation.alias,
					})

					return acc
				},
				{} as Record<
					string,
					{
						page_id: string
						page_type: PageType
						translations: Array<{
							language: string
							alias: string
						}>
					}
				>
			)

			// Convert to array
			return Object.values(groupedByPage)
		} catch (error) {
			logger.error("Error getting grouped page aliases:", error)
			throw new Error("Failed to get grouped page aliases")
		}
	}
}
