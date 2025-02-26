import {FAQCategory, FAQItem, Prisma} from "@prisma/client"
import prisma from "../lib/prisma"
import {LanguageService} from "./language.service"
import logger from "../utils/logger"
import {PaginationParams, PaginatedResponse} from "../interfaces/pagination.interface"

interface FAQCategoryData {
	name: string
	description?: string
	order_index?: number
}

interface FAQItemData {
	question: string
	answer: string
	order_index?: number
}

export class FAQService {
	/**
	 * Create FAQ category
	 */
	async createCategory(language: string, data: FAQCategoryData): Promise<FAQCategory> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			return await prisma.fAQCategory.create({
				data: {
					order_index: data.order_index || 0,
					translations: {
						create: {
							language,
							name: data.name,
							description: data.description,
						},
					},
				},
				include: {
					translations: true,
					items: {
						include: {
							translations: true,
						},
					},
				},
			})
		} catch (error) {
			logger.error("Error creating FAQ category:", error)
			throw new Error("Failed to create FAQ category")
		}
	}

	/**
	 * Add FAQ item to category
	 */
	async addItem(categoryId: string, language: string, data: FAQItemData): Promise<FAQItem> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			// Get highest order_index
			const lastItem = await prisma.fAQItem.findFirst({
				where: {category_id: categoryId},
				orderBy: {order_index: "desc"},
			})

			const order_index = data.order_index ?? (lastItem?.order_index || 0) + 1

			return await prisma.fAQItem.create({
				data: {
					category_id: categoryId,
					order_index,
					translations: {
						create: {
							language,
							question: data.question,
							answer: data.answer,
						},
					},
				},
				include: {
					translations: true,
				},
			})
		} catch (error) {
			logger.error("Error adding FAQ item:", error)
			throw new Error("Failed to add FAQ item")
		}
	}

	/**
	 * Get all FAQs with pagination
	 */
	async getAllFAQs(language: string, params?: PaginationParams): Promise<PaginatedResponse<FAQCategory>> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			const page = params?.page || 1
			const limit = params?.limit || 10
			const skip = (page - 1) * limit

			// Get total count
			const total = await prisma.fAQCategory.count({
				where: {
					translations: {
						some: {
							language,
						},
					},
				},
			})

			// Get paginated categories with items
			const categories = await prisma.fAQCategory.findMany({
				skip,
				take: limit,
				include: {
					translations: {
						where: {language},
					},
					items: {
						orderBy: {order_index: "asc"},
						include: {
							translations: {
								where: {language},
							},
						},
					},
				},
				orderBy: params?.sort
					? {
							[params.sort]: params.order,
					  }
					: {
							order_index: params?.order || "asc",
					  },
			})

			return {
				data: categories,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			}
		} catch (error) {
			logger.error("Error getting FAQs:", error)
			throw new Error("Failed to get FAQs")
		}
	}

	/**
	 * Update FAQ category
	 */
	async updateCategory(categoryId: string, language: string, data: FAQCategoryData): Promise<FAQCategory> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			return await prisma.fAQCategory.update({
				where: {id: categoryId},
				data: {
					order_index: data.order_index,
					translations: {
						upsert: {
							where: {
								category_id_language: {
									category_id: categoryId,
									language,
								},
							},
							create: {
								language,
								name: data.name,
								description: data.description,
							},
							update: {
								name: data.name,
								description: data.description,
							},
						},
					},
				},
				include: {
					translations: true,
					items: {
						include: {
							translations: true,
						},
					},
				},
			})
		} catch (error) {
			logger.error("Error updating FAQ category:", error)
			throw new Error("Failed to update FAQ category")
		}
	}

	/**
	 * Update FAQ item
	 */
	async updateItem(itemId: string, language: string, data: FAQItemData): Promise<FAQItem> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			return await prisma.fAQItem.update({
				where: {id: itemId},
				data: {
					order_index: data.order_index,
					translations: {
						upsert: {
							where: {
								item_id_language: {
									item_id: itemId,
									language,
								},
							},
							create: {
								language,
								question: data.question,
								answer: data.answer,
							},
							update: {
								question: data.question,
								answer: data.answer,
							},
						},
					},
				},
				include: {
					translations: true,
				},
			})
		} catch (error) {
			logger.error("Error updating FAQ item:", error)
			throw new Error("Failed to update FAQ item")
		}
	}

	/**
	 * Delete FAQ category
	 */
	async deleteCategory(categoryId: string): Promise<void> {
		try {
			await prisma.fAQCategory.delete({
				where: {id: categoryId},
			})
		} catch (error) {
			logger.error("Error deleting FAQ category:", error)
			throw new Error("Failed to delete FAQ category")
		}
	}

	/**
	 * Delete FAQ item
	 */
	async deleteItem(itemId: string): Promise<void> {
		try {
			await prisma.fAQItem.delete({
				where: {id: itemId},
			})
		} catch (error) {
			logger.error("Error deleting FAQ item:", error)
			throw new Error("Failed to delete FAQ item")
		}
	}

	/**
	 * Update FAQ category order
	 */
	async updateCategoryOrder(categoryId: string, newOrder: number): Promise<FAQCategory> {
		try {
			return await prisma.fAQCategory.update({
				where: {id: categoryId},
				data: {order_index: newOrder},
				include: {
					translations: true,
				},
			})
		} catch (error) {
			logger.error("Error updating FAQ category order:", error)
			throw new Error("Failed to update FAQ category order")
		}
	}

	/**
	 * Update FAQ item order
	 */
	async updateItemOrder(itemId: string, newOrder: number): Promise<FAQItem> {
		try {
			return await prisma.fAQItem.update({
				where: {id: itemId},
				data: {order_index: newOrder},
				include: {
					translations: true,
				},
			})
		} catch (error) {
			logger.error("Error updating FAQ item order:", error)
			throw new Error("Failed to update FAQ item order")
		}
	}

	/**
	 * Get single FAQ category with translations
	 */
	async getCategory(categoryId: string, language: string): Promise<FAQCategory> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			const category = await prisma.fAQCategory.findUnique({
				where: {id: categoryId},
				include: {
					translations: {
						where: {language},
					},
				},
			})

			if (!category) {
				throw new Error(`FAQ category not found: ${categoryId}`)
			}

			return category
		} catch (error) {
			logger.error("Error getting FAQ category:", error)
			throw new Error(error instanceof Error ? error.message : "Failed to get FAQ category")
		}
	}

	/**
	 * Get all FAQ categories with pagination
	 */
	async getCategories(language: string, params?: PaginationParams): Promise<PaginatedResponse<FAQCategory>> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			const page = params?.page || 1
			const limit = params?.limit || 10
			const skip = (page - 1) * limit

			// Get total count
			const total = await prisma.fAQCategory.count({
				where: {
					translations: {
						some: {
							language,
						},
					},
				},
			})

			// Get paginated categories
			const categories = await prisma.fAQCategory.findMany({
				skip,
				take: limit,
				include: {
					translations: {
						where: {language},
					},
				},
				orderBy: {
					order_index: params?.order || "asc",
				},
			})

			return {
				data: categories,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			}
		} catch (error) {
			logger.error("Error getting FAQ categories:", error)
			throw new Error("Failed to get FAQ categories")
		}
	}

	/**
	 * Get items for a specific category
	 */
	async getCategoryItems(categoryId: string, language: string): Promise<FAQItem[]> {
		try {
			// Validate language
			if (!LanguageService.isValidLanguage(language)) {
				throw new Error(`Unsupported language: ${language}`)
			}

			// First verify category exists
			const category = await prisma.fAQCategory.findUnique({
				where: {id: categoryId},
			})

			if (!category) {
				throw new Error(`FAQ category not found: ${categoryId}`)
			}

			return await prisma.fAQItem.findMany({
				where: {category_id: categoryId},
				include: {
					translations: {
						where: {language},
					},
				},
				orderBy: {
					order_index: "asc",
				},
			})
		} catch (error) {
			logger.error("Error getting category items:", error)
			throw new Error(error instanceof Error ? error.message : "Failed to get category items")
		}
	}
}
