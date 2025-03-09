import {Request, Response} from "express"
import {AuthorService} from "../services/author.service"
import {Prisma} from "@prisma/client"
import logger from "../utils/logger"

export class AuthorController {
	private authorService: AuthorService

	constructor() {
		this.authorService = new AuthorService()
	}

	/**
	 * Get author details by ID or current user
	 */
	public async getCurrentAuthorDetail(req: Request, res: Response): Promise<void> {
		try {
			const {language, id} = req.query

			// Make language parameter required
			if (!language || typeof language !== "string") {
				res.status(400).json({
					error: "Language parameter is required",
					code: "VALIDATION_ERROR",
					details: {
						message: "You must specify a language using the 'language' query parameter",
						supported_languages: ["en", "it", "pt", "es"],
					},
				})
				return
			}

			// If id is provided, get author details by id (public access)
			if (id && typeof id === "string") {
				const authorDetail = await this.authorService.getAuthorDetailById(id, language)

				if (!authorDetail) {
					res.status(404).json({
						error: "Author not found",
						code: "NOT_FOUND",
					})
					return
				}

				// Format the response to transform translations array to record
				const formattedAuthor = this.formatAuthorResponse(authorDetail, language)
				res.json(formattedAuthor)
				return
			}

			// If authenticated, get current user's author details
			if (req.user?.id) {
				const authorDetail = await this.authorService.getAuthorDetailByUserId(req.user.id, language)

				if (!authorDetail) {
					res.status(404).json({
						error: "Author not found",
						code: "NOT_FOUND",
					})
					return
				}

				// Format the response to transform translations array to record
				const formattedAuthor = this.formatAuthorResponse(authorDetail, language)
				res.json(formattedAuthor)
				return
			}

			// If no id provided and not authenticated, return all authors
			const authors = await this.authorService.getAllAuthors(language)

			// Format each author to transform translations array to record
			const formattedAuthors = authors.map((author) => this.formatAuthorResponse(author, language))
			res.json(formattedAuthors)
		} catch (error) {
			logger.error("Error getting author detail:", error)
			if (error instanceof Error) {
				res.status(400).json({
					error: error.message,
					code: "BAD_REQUEST",
				})
				return
			}
			res.status(500).json({
				error: "Failed to get author detail",
				code: "SERVER_ERROR",
			})
		}
	}

	/**
	 * Format author response to transform translations array to record
	 */
	private formatAuthorResponse(author: any, language: string): any {
		// Create a copy of the author object
		const formattedAuthor = {...author}

		// Transform translations array to record
		if (Array.isArray(formattedAuthor.translations)) {
			const translationsRecord: Record<string, any> = {}

			formattedAuthor.translations.forEach((translation: any) => {
				if (translation.language) {
					translationsRecord[translation.language] = {
						name: translation.name,
						description: translation.description,
					}
				}
			})

			formattedAuthor.translations = translationsRecord
		}

		return formattedAuthor
	}

	/**
	 * Create or update current user's author details
	 */
	public async updateCurrentAuthorDetail(req: Request, res: Response): Promise<void> {
		try {
			const {language} = req.query

			// Make language parameter required
			if (!language || typeof language !== "string") {
				res.status(400).json({
					error: "Language parameter is required",
					code: "VALIDATION_ERROR",
					details: {
						message: "You must specify a language using the 'language' query parameter",
						supported_languages: ["en", "it", "pt", "es"],
					},
				})
				return
			}

			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "UNAUTHORIZED",
				})
				return
			}

			const {profile_image_url, name, description, translations} = req.body

			// Check if author detail exists
			let authorDetail = await this.authorService.getAuthorDetailByUserId(req.user.id, language)

			if (authorDetail) {
				// Update the author detail with the language-specific data
				authorDetail = await this.authorService.updateAuthorDetail(
					req.user.id,
					{
						profile_image_url,
						name,
						description,
						translations,
					},
					language
				)

				res.status(200).json(authorDetail)
			} else {
				// Create new author detail
				// For new author details, name is required
				if (!name && (!translations || !translations[language]?.name)) {
					res.status(400).json({
						error: "Name is required for creating new author details",
						code: "VALIDATION_ERROR",
					})
					return
				}

				// Create the author detail
				authorDetail = await this.authorService.updateAuthorDetail(
					req.user.id,
					{
						profile_image_url,
						name,
						description,
						translations,
					},
					language
				)

				res.status(201).json(authorDetail)
			}
		} catch (error) {
			logger.error("Error updating author details:", error)

			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				// Handle unique constraint violations
				if (error.code === "P2002") {
					res.status(400).json({
						error: "Duplicate entry",
						code: "VALIDATION_ERROR",
						details: {
							message: "This author detail already exists",
						},
					})
					return
				}

				// Handle foreign key constraint violations
				if (error.code === "P2003") {
					res.status(400).json({
						error: "Invalid reference",
						code: "VALIDATION_ERROR",
						details: {
							message: "Referenced user does not exist",
						},
					})
					return
				}
			}

			res.status(500).json({
				error: "Failed to update author details",
				message: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		}
	}

	/**
	 * Get list of active blog authors
	 */
	public async getActiveBlogAuthors(req: Request, res: Response): Promise<void> {
		try {
			const authors = await this.authorService.getActiveBlogAuthors()
			res.status(200).json(authors)
		} catch (error) {
			logger.error("Error getting active blog authors:", error)
			res.status(500).json({
				error: "Failed to get authors",
				message: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		}
	}
}
