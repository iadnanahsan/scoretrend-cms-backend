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
			return await prisma.pageTranslation.upsert({
				where: {
					page_id_language: {
						page_id: pageId,
						language,
					},
				},
				update: {
					alias: data.alias,
					seo_data: data.seo_data as Prisma.JsonObject,
				},
				create: {
					page_id: pageId,
					language,
					alias: data.alias,
					seo_data: data.seo_data as Prisma.JsonObject,
				},
			})
		} catch (error) {
			logger.error("Error updating page translation:", error)
			throw new Error("Failed to update page translation")
		}
	}

	/**
	 * Get page SEO data
	 */
	async getPageSEO(pageId: string, language: string): Promise<SEOData> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
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
			},
		})

		if (!translation) {
			throw new Error("Page translation not found")
		}

		return translation.seo_data as unknown as SEOData
	}

	/**
	 * Update page SEO data
	 */
	async updatePageSEO(pageId: string, language: string, seoData: JsonSEOData): Promise<PageTranslation> {
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

			return await prisma.pageTranslation.upsert({
				where: {
					page_id_language: {
						page_id: pageId,
						language,
					},
				},
				update: {
					seo_data: seoData as Prisma.JsonObject,
				},
				create: {
					page_id: pageId,
					language,
					alias: existingTranslation?.alias || `${page.type.toLowerCase()}-${language}`, // Generate default alias
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
					if (page.type === PageType.HOW_IT_WORKS && section.type === SectionType.STANDINGS) {
						// Skip duplicate check for STANDINGS in HOW_IT_WORKS page
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
}
