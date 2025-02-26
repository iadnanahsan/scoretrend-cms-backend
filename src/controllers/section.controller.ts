import {Request, Response} from "express"
import {SectionService} from "../services/section.service"
import {SectionType} from "@prisma/client"
import logger from "../utils/logger"
import {SectionValidationError} from "../services/error.service"

export class SectionController {
	private sectionService: SectionService

	constructor() {
		this.sectionService = new SectionService()
	}

	// Get all sections for a page
	public async getSections(req: Request, res: Response): Promise<void> {
		try {
			const {pageId} = req.params
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const sections = await this.sectionService.getAllSections(pageId, language)
			res.json(sections)
		} catch (error) {
			logger.error("Error getting sections:", error)
			if (error instanceof Error) {
				if (error.message.includes("Unsupported language")) {
					res.status(400).json({error: error.message})
					return
				}
				res.status(500).json({error: "Failed to get sections"})
				return
			}
			res.status(500).json({error: "Failed to get sections"})
		}
	}

	// Create new section
	public async createSection(req: Request, res: Response): Promise<void> {
		try {
			const {pageId} = req.params
			const {type, order_index} = req.body

			// Validate section type
			if (!Object.values(SectionType).includes(type)) {
				res.status(400).json({
					error: {
						code: "INVALID_SECTION_TYPE",
						message: "Invalid section type",
						help: {
							suggestion: "Use one of the allowed section types",
							allowed_types: Object.values(SectionType),
						},
					},
				})
				return
			}

			// Validate order_index
			if (order_index === undefined || order_index === null) {
				res.status(400).json({
					error: {
						code: "MISSING_ORDER_INDEX",
						message: "order_index is required",
						help: {
							suggestion: "Provide a non-negative integer value for order_index",
							example: {
								type: "HERO",
								order_index: 0,
							},
						},
					},
				})
				return
			}

			if (typeof order_index !== "number" || order_index < 0 || !Number.isInteger(order_index)) {
				res.status(400).json({
					error: {
						code: "INVALID_ORDER_INDEX",
						message: "Invalid order_index value",
						help: {
							suggestion: "order_index must be a non-negative integer",
							received: order_index,
							example: {
								type: "HERO",
								order_index: 0,
							},
						},
					},
				})
				return
			}

			const section = await this.sectionService.createSection(pageId, type, order_index)
			res.status(201).json(section)
		} catch (error) {
			logger.error("Error creating section:", error)

			if (error instanceof SectionValidationError) {
				// Parse the validation error response
				const validationError = JSON.parse(error.message)
				res.status(400).json(validationError)
				return
			}

			if (error instanceof Error) {
				if (error.message.includes("Page not found")) {
					res.status(404).json({error: "Page not found"})
					return
				}
				res.status(400).json({error: error.message})
				return
			}

			res.status(500).json({error: "Failed to create section"})
		}
	}

	// Get section by ID
	public async getSectionById(req: Request, res: Response): Promise<void> {
		try {
			const {sectionId} = req.params
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const section = await this.sectionService.getSection(sectionId, language)
			if (!section) {
				res.status(404).json({error: "Section not found"})
				return
			}
			res.json(section)
		} catch (error) {
			logger.error("Error getting section:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get section"})
		}
	}

	// Update section translation
	public async updateSectionTranslation(req: Request, res: Response): Promise<void> {
		try {
			const {sectionId} = req.params
			const {language, content} = req.body

			const translation = await this.sectionService.updateSectionTranslation(sectionId, language, {
				content,
			})
			res.json(translation)
		} catch (error) {
			logger.error("Error updating section translation:", error)

			if (error instanceof SectionValidationError) {
				const validationError = JSON.parse(error.message)
				res.status(400).json(validationError)
				return
			}

			if (error instanceof Error) {
				if (error.message.includes("Section not found")) {
					res.status(404).json({error: error.message})
					return
				}
				try {
					const parsedError = JSON.parse(error.message)
					res.status(422).json(parsedError)
					return
				} catch {
					res.status(400).json({error: error.message})
				}
				return
			}

			res.status(500).json({error: "Failed to update section translation"})
		}
	}

	// Delete section
	public async deleteSection(req: Request, res: Response): Promise<void> {
		try {
			const {sectionId} = req.params
			await this.sectionService.deleteSection(sectionId)
			res.status(200).json({
				success: true,
				message: "Section deleted successfully",
				data: {
					sectionId,
				},
			})
		} catch (error) {
			logger.error("Error deleting section:", error)
			if (error instanceof Error) {
				if (error.message.includes("Section not found")) {
					res.status(404).json({error: error.message})
					return
				}
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to delete section"})
		}
	}

	// Update section order
	public async updateSectionOrder(req: Request, res: Response): Promise<void> {
		try {
			const {sectionId} = req.params
			const {order_index} = req.body

			if (typeof order_index !== "number" || order_index < 0) {
				res.status(400).json({error: "Invalid order index"})
				return
			}

			const section = await this.sectionService.updateSectionOrder(sectionId, order_index)
			res.json(section)
		} catch (error) {
			logger.error("Error updating section order:", error)
			if (error instanceof Error) {
				if (error.message.includes("Section not found")) {
					res.status(404).json({error: error.message})
					return
				}
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update section order"})
		}
	}
}
