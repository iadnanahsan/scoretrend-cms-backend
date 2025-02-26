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
	 * Get current user's author details
	 */
	public async getCurrentAuthorDetail(req: Request, res: Response): Promise<void> {
		try {
			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "UNAUTHORIZED",
					details: {
						message: "You must be logged in to access author details",
					},
				})
				return
			}

			const {language} = req.query
			const authorDetail = await this.authorService.getAuthorDetailByUserId(req.user.id, language as string)

			if (!authorDetail) {
				res.status(404).json({
					error: "Author details not found",
					code: "NOT_FOUND",
					details: {
						message: "You haven't set up your author details yet",
						user_id: req.user.id,
					},
				})
				return
			}

			res.json(authorDetail)
		} catch (error) {
			logger.error("Error getting current author detail:", error)
			if (error instanceof Error) {
				if (error.message.includes("Invalid language")) {
					res.status(400).json({
						error: "Invalid language code",
						code: "VALIDATION_ERROR",
						details: {
							message: error.message,
							supported_languages: ["en", "it", "pt", "es"],
						},
					})
					return
				}
			}
			res.status(500).json({
				error: "Failed to get author details",
				code: "INTERNAL_ERROR",
				details: {
					message: error instanceof Error ? error.message : "Unknown error occurred",
				},
			})
		}
	}

	/**
	 * Create or update current user's author details
	 */
	public async updateCurrentAuthorDetail(req: Request, res: Response): Promise<void> {
		try {
			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "UNAUTHORIZED",
					details: {
						message: "You must be logged in to manage author details",
					},
				})
				return
			}

			const {profile_image_url, translations} = req.body

			// Check if author detail exists
			let authorDetail = await this.authorService.getAuthorDetailByUserId(req.user.id)

			if (authorDetail) {
				// Update existing author detail
				authorDetail = await this.authorService.updateAuthorDetail(authorDetail.id, {
					profile_image_url,
					translations,
				})
				res.json(authorDetail)
			} else {
				// Create new author detail
				authorDetail = await this.authorService.createAuthorDetail({
					user_id: req.user.id,
					profile_image_url,
					translations,
				})
				res.status(201).json(authorDetail)
			}
		} catch (error) {
			logger.error("Error updating current author detail:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2002") {
					res.status(409).json({
						error: "Author detail already exists",
						code: "DUPLICATE_ENTRY",
						details: {
							message: "You already have author details set up",
							user_id: req.user?.id,
						},
					})
					return
				}
				if (error.code === "P2003") {
					res.status(400).json({
						error: "Invalid user reference",
						code: "VALIDATION_ERROR",
						details: {
							message: "The specified user does not exist",
							user_id: req.user?.id,
						},
					})
					return
				}
			}
			if (error instanceof Error) {
				if (error.message.includes("Invalid language")) {
					res.status(400).json({
						error: "Invalid language code",
						code: "VALIDATION_ERROR",
						details: {
							message: error.message,
							supported_languages: ["en", "it", "pt", "es"],
						},
					})
					return
				}
			}
			res.status(500).json({
				error: "Failed to update author details",
				code: "INTERNAL_ERROR",
				details: {
					message: error instanceof Error ? error.message : "Unknown error occurred",
				},
			})
		}
	}
}
