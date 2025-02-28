import {Request, Response} from "express"
import {FAQService} from "../services/faq.service"
import logger from "../utils/logger"
import {PaginationParams} from "../interfaces/pagination.interface"

export class FAQController {
	private faqService: FAQService

	constructor() {
		this.faqService = new FAQService()
	}

	/**
	 * Get all FAQs with pagination
	 */
	public async getAllFAQs(req: Request, res: Response): Promise<void> {
		try {
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const paginationParams: PaginationParams = {
				page: Number(req.query.page) || 1,
				limit: Number(req.query.limit) || 10,
				sort: req.query.sort as string,
				order: (req.query.order as "asc" | "desc") || "desc",
			}

			const faqs = await this.faqService.getAllFAQs(language, paginationParams)
			res.json(faqs)
		} catch (error) {
			logger.error("Error getting FAQs:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get FAQs"})
		}
	}

	/**
	 * Create FAQ category
	 */
	public async createCategory(req: Request, res: Response): Promise<void> {
		try {
			const {language} = req.query
			const {name, description, order_index} = req.body

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			if (!name) {
				res.status(400).json({error: "Category name is required"})
				return
			}

			const category = await this.faqService.createCategory(language, {
				name,
				description,
				order_index,
			})
			res.status(201).json(category)
		} catch (error) {
			logger.error("Error creating FAQ category:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to create FAQ category"})
		}
	}

	/**
	 * Add FAQ item to category
	 */
	public async addItem(req: Request, res: Response): Promise<void> {
		try {
			const {categoryId} = req.params
			const {language} = req.query
			const {question, answer, order_index} = req.body

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			if (!question || !answer) {
				res.status(400).json({
					error: "Question and answer are required",
					details: {
						question: !question ? "Question is required" : undefined,
						answer: !answer ? "Answer is required" : undefined,
					},
				})
				return
			}

			const item = await this.faqService.addItem(categoryId, language, {
				question,
				answer,
				order_index,
			})
			res.status(201).json(item)
		} catch (error) {
			logger.error("Error adding FAQ item:", error)
			if (error instanceof Error) {
				if (error.message.includes("not found")) {
					res.status(404).json({error: error.message})
					return
				}
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to add FAQ item"})
		}
	}

	/**
	 * Update FAQ category
	 */
	public async updateCategory(req: Request, res: Response): Promise<void> {
		try {
			const {categoryId} = req.params
			const {language} = req.query
			const {name, description, order_index} = req.body

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			if (!name) {
				res.status(400).json({error: "Category name is required"})
				return
			}

			const category = await this.faqService.updateCategory(categoryId, language, {
				name,
				description,
				order_index,
			})
			res.json(category)
		} catch (error) {
			logger.error("Error updating FAQ category:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update FAQ category"})
		}
	}

	/**
	 * Update FAQ item
	 */
	public async updateItem(req: Request, res: Response): Promise<void> {
		try {
			const {itemId} = req.params
			const {language} = req.query
			const {question, answer, order_index} = req.body

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			if (!question || !answer) {
				res.status(400).json({
					error: "Question and answer are required",
					details: {
						question: !question ? "Question is required" : undefined,
						answer: !answer ? "Answer is required" : undefined,
					},
				})
				return
			}

			const item = await this.faqService.updateItem(itemId, language, {
				question,
				answer,
				order_index,
			})
			res.json(item)
		} catch (error) {
			logger.error("Error updating FAQ item:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update FAQ item"})
		}
	}

	/**
	 * Delete FAQ category
	 */
	public async deleteCategory(req: Request, res: Response): Promise<void> {
		try {
			const {categoryId} = req.params
			await this.faqService.deleteCategory(categoryId)
			res.status(200).json({message: "FAQ category deleted successfully"})
		} catch (error) {
			logger.error("Error deleting FAQ category:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to delete FAQ category"})
		}
	}

	/**
	 * Delete FAQ item
	 */
	public async deleteItem(req: Request, res: Response): Promise<void> {
		try {
			const {itemId} = req.params
			await this.faqService.deleteItem(itemId)
			res.status(200).json({
				success: true,
				message: "FAQ item deleted successfully",
				deleted_item_id: itemId,
			})
		} catch (error) {
			logger.error("Error deleting FAQ item:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to delete FAQ item"})
		}
	}

	/**
	 * Update FAQ category order
	 */
	public async updateCategoryOrder(req: Request, res: Response): Promise<void> {
		try {
			const {categoryId} = req.params
			const {order_index} = req.body

			if (typeof order_index !== "number") {
				res.status(400).json({error: "Order index must be a number"})
				return
			}

			const category = await this.faqService.updateCategoryOrder(categoryId, order_index)
			res.json(category)
		} catch (error) {
			logger.error("Error updating FAQ category order:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update FAQ category order"})
		}
	}

	/**
	 * Update FAQ item order
	 */
	public async updateItemOrder(req: Request, res: Response): Promise<void> {
		try {
			const {itemId} = req.params
			const {order_index} = req.body

			if (typeof order_index !== "number") {
				res.status(400).json({error: "Order index must be a number"})
				return
			}

			const item = await this.faqService.updateItemOrder(itemId, order_index)
			res.json(item)
		} catch (error) {
			logger.error("Error updating FAQ item order:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update FAQ item order"})
		}
	}

	/**
	 * Get single FAQ category
	 */
	public async getCategory(req: Request, res: Response): Promise<void> {
		try {
			const {categoryId} = req.params
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const category = await this.faqService.getCategory(categoryId, language)
			res.json(category)
		} catch (error) {
			logger.error("Error getting FAQ category:", error)
			if (error instanceof Error) {
				if (error.message.includes("not found")) {
					res.status(404).json({error: error.message})
					return
				}
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get FAQ category"})
		}
	}

	/**
	 * Get all FAQ categories with pagination
	 */
	public async getCategories(req: Request, res: Response): Promise<void> {
		try {
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const paginationParams: PaginationParams = {
				page: Number(req.query.page) || 1,
				limit: Number(req.query.limit) || 10,
				order: (req.query.order as "asc" | "desc") || "desc",
			}

			const categories = await this.faqService.getCategories(language, paginationParams)
			res.json(categories)
		} catch (error) {
			logger.error("Error getting FAQ categories:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get FAQ categories"})
		}
	}

	/**
	 * Get items for a specific category
	 */
	public async getCategoryItems(req: Request, res: Response): Promise<void> {
		try {
			const {categoryId} = req.params
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const items = await this.faqService.getCategoryItems(categoryId, language)

			// If no items found, return a more descriptive response
			if (items.length === 0) {
				res.json({
					message: "No FAQ items found for this category",
					data: [],
					category_id: categoryId,
				})
				return
			}

			res.json(items)
		} catch (error) {
			logger.error("Error getting category items:", error)
			if (error instanceof Error) {
				if (error.message.includes("not found")) {
					res.status(404).json({error: error.message})
					return
				}
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get category items"})
		}
	}
}
