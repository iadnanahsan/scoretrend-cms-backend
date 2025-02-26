import {Section, SectionTranslation, SectionType, Prisma, PageType} from "@prisma/client"
import prisma from "../lib/prisma"
import {ContentFactory} from "./content.factory"
import {LanguageService} from "./language.service"
import {ContentUpdateManager} from "./content.observer"
import logger from "../utils/logger"
import {validateSectionContent} from "../validators/section.validator"
import {
	ValidationErrorCode,
	createInvalidSectionTypeError,
	createDuplicateSectionError,
	SectionValidationError,
} from "./error.service"

// Import fixed sections constant
import {PAGE_FIXED_SECTIONS} from "./page.service"

export interface SectionTranslationData {
	content: Record<string, any>
}

interface ValidationError {
	field: string
	message: string
}

export class SectionService {
	private contentUpdateManager: ContentUpdateManager
	private readonly MAX_TITLE_LENGTH = 100
	private readonly MAX_DESCRIPTION_LENGTH = 5000

	constructor() {
		this.contentUpdateManager = new ContentUpdateManager()
	}

	/**
	 * Validate section content with enhanced error reporting
	 */
	private validateSectionContent(type: SectionType, content: Record<string, any>): void {
		try {
			const validationResult = validateSectionContent(type, content)
			if (!validationResult.isValid) {
				throw new Error(JSON.stringify(validationResult))
			}
		} catch (error) {
			logger.error("Section content validation error:", error)
			throw error
		}
	}

	/**
	 * Get section with translations
	 */
	async getSection(sectionId: string, language: string): Promise<Section & {translations: SectionTranslation[]}> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		const section = await prisma.section.findUnique({
			where: {id: sectionId},
			include: {
				translations: {
					where: {language},
				},
			},
		})

		if (!section) {
			throw new Error(`Section not found: ${sectionId}`)
		}

		return section
	}

	/**
	 * Create new section with enhanced validation and error handling
	 */
	async createSection(pageId: string, type: SectionType, orderIndex: number): Promise<Section> {
		try {
			// Get page type first
			const page = await prisma.page.findUnique({
				where: {id: pageId},
				include: {
					sections: true,
				},
			})

			if (!page) {
				throw new Error("Page not found")
			}

			// Check if this page type has fixed sections
			const fixedSections = PAGE_FIXED_SECTIONS[page.type]

			// If fixedSections is null, this page type doesn't support sections
			if (fixedSections === null) {
				throw new SectionValidationError({
					code: ValidationErrorCode.SECTION_NOT_ALLOWED,
					message: `Page type ${page.type} does not support sections`,
					details: {
						page_type: page.type,
						attempted_section: type,
					},
					help: {
						suggestion: "This page type only supports SEO data",
					},
				})
			}

			// Get existing section types
			const existingSections = page.sections.map((s) => s.type)

			// Check if section type is allowed
			if (!fixedSections.includes(type)) {
				throw new SectionValidationError(
					createInvalidSectionTypeError(page.type, type, fixedSections, existingSections)
				)
			}

			// Check for duplicates (unless it's a repeatable section type)
			const repeatableSections: SectionType[] = [SectionType.CONTENT]

			// Allow multiple STANDINGS sections for HOW_IT_WORKS page
			const isSpecialCase = page.type === PageType.HOW_IT_WORKS && type === SectionType.STANDINGS

			if (!repeatableSections.includes(type) && !isSpecialCase) {
				const existingSection = page.sections.find((s) => s.type === type)
				if (existingSection) {
					throw new SectionValidationError(
						createDuplicateSectionError(
							page.type,
							type,
							existingSection.id,
							fixedSections,
							existingSections
						)
					)
				}
			}

			return await prisma.section.create({
				data: {
					page_id: pageId,
					type,
					order_index: orderIndex,
				},
			})
		} catch (error) {
			logger.error("Error creating section:", error)
			if (error instanceof SectionValidationError) {
				throw error
			}
			throw new Error(error instanceof Error ? error.message : "Failed to create section")
		}
	}

	/**
	 * Update section translation with enhanced validation
	 */
	async updateSectionTranslation(
		sectionId: string,
		language: string,
		data: SectionTranslationData
	): Promise<SectionTranslation> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		try {
			// Get section type
			const section = await prisma.section.findUnique({
				where: {id: sectionId},
			})

			if (!section) {
				throw new Error("Section not found")
			}

			// Validate content based on section type
			this.validateSectionContent(section.type, data.content)

			// Use ContentFactory to create and validate section content
			const sectionContent = ContentFactory.createSection(section.type, data.content)

			// Convert to Prisma JSON compatible format
			const content: Prisma.JsonObject = {
				...sectionContent,
				_type: section.type,
			}

			// Update or create translation
			const translation = await prisma.sectionTranslation.upsert({
				where: {
					section_id_language: {
						section_id: sectionId,
						language,
					},
				},
				update: {
					content,
				},
				create: {
					section_id: sectionId,
					language,
					content,
				},
			})

			// Notify observers about content update
			this.contentUpdateManager.notifyContentUpdate({
				type: "SECTION_UPDATE",
				sectionId,
				language,
				content,
			})

			return translation
		} catch (error) {
			logger.error("Error updating section translation:", error)
			throw new Error(error instanceof Error ? error.message : "Failed to update section translation")
		}
	}

	/**
	 * Update section order
	 */
	async updateSectionOrder(sectionId: string, newOrder: number): Promise<Section> {
		try {
			return await prisma.section.update({
				where: {id: sectionId},
				data: {order_index: newOrder},
			})
		} catch (error) {
			logger.error("Error updating section order:", error)
			throw new Error("Failed to update section order")
		}
	}

	/**
	 * Delete section and its translations
	 */
	async deleteSection(sectionId: string): Promise<void> {
		try {
			// First check if section exists
			const section = await prisma.section.findUnique({
				where: {id: sectionId},
				include: {translations: true},
			})

			if (!section) {
				throw new Error(`Section not found: ${sectionId}`)
			}

			// Delete section (translations will be deleted automatically due to cascade)
			await prisma.$transaction(async (tx) => {
				await tx.section.delete({
					where: {id: sectionId},
				})
			})

			logger.info(`Successfully deleted section ${sectionId} with ${section.translations.length} translations`)
		} catch (error) {
			logger.error("Error deleting section:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2003") {
					throw new Error("Cannot delete section due to existing references")
				}
			}
			throw new Error("Failed to delete section")
		}
	}

	/**
	 * Get all sections for a page with translations
	 */
	async getAllSections(
		pageId: string,
		language: string
	): Promise<(Section & {translations: SectionTranslation[]})[]> {
		// Validate language
		if (!LanguageService.isValidLanguage(language)) {
			throw new Error(`Unsupported language: ${language}`)
		}

		const sections = await prisma.section.findMany({
			where: {
				page_id: pageId,
			},
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
		})

		return sections
	}
}
