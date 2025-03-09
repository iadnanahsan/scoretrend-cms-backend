import {PrismaClient, AuthorDetail} from "@prisma/client"
import logger from "../utils/logger"
import {LanguageService} from "./language.service"
import {SUPPORTED_LANGUAGES, SupportedLanguage} from "../config/languages"
import {AuthorDetailWithUser, UpdateAuthorDetailInput, AuthorTranslation} from "../types/author.types"
import {BadRequestError, NotFoundError} from "../utils/errors"

const prisma = new PrismaClient()

export interface CreateAuthorDetailData {
	user_id: string
	profile_image_url?: string
	translations: Record<string, AuthorTranslation>
}

export interface UpdateAuthorDetailData {
	profile_image_url?: string
	translations?: Record<string, AuthorTranslation>
}

export interface BlogAuthor {
	id: string
	user_id: string
	name: string
	profile_image_url?: string
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
	async getAuthorDetailByUserId(userId: string, language: string): Promise<AuthorDetailWithUser | null> {
		if (!LanguageService.isValidLanguage(language)) {
			throw new BadRequestError(
				`Invalid language code: ${language}. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(
					", "
				)}`
			)
		}

		const authorDetail = await prisma.authorDetail.findUnique({
			where: {user_id: userId},
			include: {
				translations: {
					where: {language},
				},
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		})

		return authorDetail as AuthorDetailWithUser
	}

	/**
	 * Update author detail with translations
	 */
	async updateAuthorDetail(
		userId: string,
		data: UpdateAuthorDetailInput,
		language: string
	): Promise<AuthorDetailWithUser> {
		if (!LanguageService.isValidLanguage(language)) {
			throw new BadRequestError(
				`Invalid language code: ${language}. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(
					", "
				)}`
			)
		}

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {id: userId},
		})

		if (!user) {
			throw new NotFoundError("User not found")
		}

		// Check if author detail exists
		const existingAuthorDetail = await prisma.authorDetail.findUnique({
			where: {user_id: userId},
			include: {
				translations: true,
			},
		})

		if (existingAuthorDetail) {
			// Update existing author detail
			const updateData: any = {}

			// Update profile image if provided
			if (data.profile_image_url) {
				updateData.profile_image_url = data.profile_image_url
			}

			// Update translations for the specified language
			if (data.name || data.description) {
				// Find existing translation for this language
				const existingTranslation = existingAuthorDetail.translations.find((t) => t.language === language)

				if (existingTranslation) {
					// Update existing translation
					await prisma.authorDetailTranslation.update({
						where: {
							id: existingTranslation.id,
						},
						data: {
							name: data.name || existingTranslation.name,
							description: data.description || existingTranslation.description,
						},
					})
				} else {
					// Create new translation
					await prisma.authorDetailTranslation.create({
						data: {
							author_detail_id: existingAuthorDetail.id,
							language,
							name: data.name || "",
							description: data.description || "",
						},
					})
				}
			}

			// If translations are provided in the old format, update them
			if (data.translations) {
				for (const [lang, trans] of Object.entries(data.translations)) {
					const translation = trans as AuthorTranslation
					if (!LanguageService.isValidLanguage(lang)) {
						throw new BadRequestError(
							`Invalid language code: ${lang}. Supported languages: ${Object.keys(
								SUPPORTED_LANGUAGES
							).join(", ")}`
						)
					}

					// Find existing translation for this language
					const existingTranslation = existingAuthorDetail.translations.find((t) => t.language === lang)

					if (existingTranslation) {
						// Update existing translation
						await prisma.authorDetailTranslation.update({
							where: {
								id: existingTranslation.id,
							},
							data: {
								name: translation.name,
								description: translation.description || "",
							},
						})
					} else {
						// Create new translation
						await prisma.authorDetailTranslation.create({
							data: {
								author_detail_id: existingAuthorDetail.id,
								language: lang,
								name: translation.name,
								description: translation.description || "",
							},
						})
					}
				}
			}

			// Return updated author detail
			const updatedAuthorDetail = await prisma.authorDetail.findUnique({
				where: {id: existingAuthorDetail.id},
				include: {
					translations: true,
					user: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			})

			return updatedAuthorDetail as AuthorDetailWithUser
		} else {
			// Create new author detail
			// For new author details, name is required
			if (!data.name && (!data.translations || !data.translations[language]?.name)) {
				throw new BadRequestError("Name is required for creating new author details")
			}

			// Prepare translations data
			const translationsData = []

			// Handle direct language fields
			if (data.name) {
				translationsData.push({
					language,
					name: data.name,
					description: data.description || "",
				})
			}

			// Add translations from the old format
			if (data.translations) {
				for (const [lang, trans] of Object.entries(data.translations)) {
					const translation = trans as AuthorTranslation
					if (!LanguageService.isValidLanguage(lang)) {
						throw new BadRequestError(
							`Invalid language code: ${lang}. Supported languages: ${Object.keys(
								SUPPORTED_LANGUAGES
							).join(", ")}`
						)
					}

					// Skip if we already added this language
					if (lang === language && data.name) continue

					translationsData.push({
						language: lang,
						name: translation.name,
						description: translation.description || "",
					})
				}
			}

			// Create author detail with translations
			const newAuthorDetail = await prisma.authorDetail.create({
				data: {
					user_id: userId,
					profile_image_url: data.profile_image_url || null,
					translations: {
						create: translationsData,
					},
				},
				include: {
					translations: true,
					user: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			})

			return newAuthorDetail as AuthorDetailWithUser
		}
	}

	/**
	 * Update a specific language translation for an author
	 */
	async updateAuthorTranslation(
		authorDetailId: string,
		language: string,
		translation: AuthorTranslation
	): Promise<AuthorDetailWithUser> {
		if (!LanguageService.isValidLanguage(language)) {
			throw new BadRequestError(
				`Invalid language code: ${language}. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(
					", "
				)}`
			)
		}

		// Get existing author detail
		const existingAuthorDetail = await prisma.authorDetail.findUnique({
			where: {id: authorDetailId},
			include: {
				translations: true,
			},
		})

		if (!existingAuthorDetail) {
			throw new NotFoundError("Author detail not found")
		}

		// Find existing translation for this language
		const existingTranslation = existingAuthorDetail.translations.find((t) => t.language === language)

		if (existingTranslation) {
			// Update existing translation
			await prisma.authorDetailTranslation.update({
				where: {
					id: existingTranslation.id,
				},
				data: {
					name: translation.name,
					description: translation.description || "",
				},
			})
		} else {
			// Create new translation
			await prisma.authorDetailTranslation.create({
				data: {
					author_detail_id: authorDetailId,
					language,
					name: translation.name,
					description: translation.description || "",
				},
			})
		}

		// Return updated author detail
		const updatedAuthorDetail = await prisma.authorDetail.findUnique({
			where: {id: authorDetailId},
			include: {
				translations: true,
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		})

		return updatedAuthorDetail as AuthorDetailWithUser
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

	/**
	 * Get list of authors who have at least one blog post
	 * Simple implementation for blog filtering
	 */
	async getActiveBlogAuthors(): Promise<AuthorDetailWithUser[]> {
		// Get all authors who have published at least one blog post
		const authors = await prisma.$queryRaw`
      SELECT DISTINCT 
        ad.id, 
        ad.user_id, 
        ad.profile_image_url,
        ad.created_at,
        ad.updated_at,
        json_build_object(
          'id', u.id,
          'name', u.name
        ) as user
      FROM "AuthorDetail" ad
      JOIN "User" u ON ad.user_id = u.id
      JOIN "BlogPost" bp ON u.id = bp.author_id
      WHERE bp.status = 'PUBLISHED'
      ORDER BY ad.created_at DESC
    `

		return authors as AuthorDetailWithUser[]
	}

	/**
	 * Get all authors with translations for a specific language
	 */
	async getAllAuthors(language: string): Promise<AuthorDetailWithUser[]> {
		if (!LanguageService.isValidLanguage(language)) {
			throw new BadRequestError(
				`Invalid language code: ${language}. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(
					", "
				)}`
			)
		}

		// Get all authors with their translations for the specified language
		const authors = await prisma.authorDetail.findMany({
			include: {
				translations: {
					where: {
						language,
					},
				},
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: {
				created_at: "desc",
			},
		})

		return authors as AuthorDetailWithUser[]
	}
}

export default new AuthorService()
