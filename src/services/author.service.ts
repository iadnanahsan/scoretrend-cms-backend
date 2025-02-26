import {AuthorDetail, AuthorDetailTranslation, Prisma} from "@prisma/client"
import prisma from "../lib/prisma"
import logger from "../utils/logger"
import {LanguageService} from "./language.service"
import {SupportedLanguage} from "../config/languages"

export interface AuthorTranslation {
	name: string
	description?: string
}

export interface CreateAuthorDetailData {
	user_id: string
	profile_image_url?: string
	translations: Record<string, AuthorTranslation>
}

export interface UpdateAuthorDetailData {
	profile_image_url?: string
	translations?: Record<string, AuthorTranslation>
}

export class AuthorService {
	/**
	 * Create author details with translations
	 */
	async createAuthorDetail(data: CreateAuthorDetailData): Promise<AuthorDetail> {
		try {
			// Validate languages
			Object.keys(data.translations).forEach((lang) => {
				if (!LanguageService.isValidLanguage(lang)) {
					throw new Error(`Invalid language code: ${lang}`)
				}
			})

			// Create author detail with translations
			const authorDetail = await prisma.authorDetail.create({
				data: {
					user_id: data.user_id,
					profile_image_url: data.profile_image_url,
					translations: {
						create: Object.entries(data.translations).map(([language, translation]) => ({
							language,
							...translation,
						})),
					},
				},
				include: {
					translations: true,
				},
			})

			return authorDetail
		} catch (error) {
			logger.error("Error creating author detail:", error)
			throw error
		}
	}

	/**
	 * Get author detail by ID with translations
	 */
	async getAuthorDetailById(id: string, language?: string): Promise<AuthorDetail | null> {
		try {
			const authorDetail = await prisma.authorDetail.findUnique({
				where: {id},
				include: {
					translations: language
						? {
								where: {language},
						  }
						: true,
					user: {
						select: {
							id: true,
							email: true,
							name: true,
							role: true,
						},
					},
				},
			})

			return authorDetail
		} catch (error) {
			logger.error("Error getting author detail:", error)
			throw error
		}
	}

	/**
	 * Get author detail by user ID with translations
	 */
	async getAuthorDetailByUserId(userId: string, language?: string): Promise<AuthorDetail | null> {
		try {
			const authorDetail = await prisma.authorDetail.findUnique({
				where: {user_id: userId},
				include: {
					translations: language
						? {
								where: {language},
						  }
						: true,
					user: {
						select: {
							id: true,
							email: true,
							name: true,
							role: true,
						},
					},
				},
			})

			return authorDetail
		} catch (error) {
			logger.error("Error getting author detail by user ID:", error)
			throw error
		}
	}

	/**
	 * Update author detail with translations
	 */
	async updateAuthorDetail(id: string, data: UpdateAuthorDetailData): Promise<AuthorDetail> {
		try {
			// Validate languages if translations are provided
			if (data.translations) {
				Object.keys(data.translations).forEach((lang) => {
					if (!LanguageService.isValidLanguage(lang)) {
						throw new Error(`Invalid language code: ${lang}`)
					}
				})
			}

			// Get existing author detail
			const existingAuthorDetail = await prisma.authorDetail.findUnique({
				where: {id},
				include: {
					translations: true,
				},
			})

			if (!existingAuthorDetail) {
				throw new Error("Author detail not found")
			}

			// Update author detail with translations
			const authorDetail = await prisma.authorDetail.update({
				where: {id},
				data: {
					profile_image_url: data.profile_image_url,
					translations: data.translations
						? {
								deleteMany: {},
								create: Object.entries(data.translations).map(([language, translation]) => ({
									language,
									...translation,
								})),
						  }
						: undefined,
				},
				include: {
					translations: true,
					user: {
						select: {
							id: true,
							email: true,
							name: true,
							role: true,
						},
					},
				},
			})

			return authorDetail
		} catch (error) {
			logger.error("Error updating author detail:", error)
			throw error
		}
	}

	/**
	 * Delete author detail
	 */
	async deleteAuthorDetail(id: string): Promise<void> {
		try {
			await prisma.authorDetail.delete({
				where: {id},
			})
		} catch (error) {
			logger.error("Error deleting author detail:", error)
			throw error
		}
	}

	/**
	 * List author details with pagination
	 */
	async listAuthorDetails(params: {
		skip?: number
		take?: number
		language?: string
	}): Promise<{items: AuthorDetail[]; total: number}> {
		try {
			const [authorDetails, total] = await Promise.all([
				prisma.authorDetail.findMany({
					skip: params.skip,
					take: params.take,
					include: {
						translations: params.language
							? {
									where: {language: params.language},
							  }
							: true,
						user: {
							select: {
								id: true,
								email: true,
								name: true,
								role: true,
							},
						},
					},
					orderBy: {
						created_at: "desc",
					},
				}),
				prisma.authorDetail.count(),
			])

			return {
				items: authorDetails,
				total,
			}
		} catch (error) {
			logger.error("Error listing author details:", error)
			throw error
		}
	}
}
