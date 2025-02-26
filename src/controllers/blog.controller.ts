import {Request, Response} from "express"
import {BlogService} from "../services/blog.service"
import {
	CreateCategoryRequest,
	UpdateCategoryRequest,
	CreateBlogPostRequest,
	UpdateBlogPostRequest,
	CreateCommentRequest,
	UpdateCommentRequest,
	ModerateCommentRequest,
	BlogListFilters,
} from "../types/blog.types"
import {BlogStatus, CommentStatus, Prisma, UserRole} from "@prisma/client"
import logger from "../utils/logger"

export class BlogController {
	private blogService: BlogService

	constructor() {
		this.blogService = new BlogService()
	}

	/**
	 * List blog categories
	 */
	public async listCategories(req: Request, res: Response): Promise<void> {
		try {
			const {page = 1, limit = 10, language} = req.query
			const skip = (Number(page) - 1) * Number(limit)
			const take = Number(limit)

			const result = await this.blogService.listCategories({
				skip,
				take,
				language: language as string | undefined,
			})

			res.json(result)
		} catch (error) {
			logger.error("Error listing blog categories:", error)
			res.status(500).json({error: "Failed to list blog categories"})
		}
	}

	/**
	 * Create blog category
	 */
	public async createCategory(req: Request<{}, {}, CreateCategoryRequest>, res: Response): Promise<void> {
		try {
			const {translations} = req.body

			const category = await this.blogService.createCategory(translations)
			res.status(201).json(category)
		} catch (error) {
			logger.error("Error creating blog category:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2002") {
					res.status(409).json({error: "Category with this name already exists"})
					return
				}
			}
			res.status(500).json({error: "Failed to create blog category"})
		}
	}

	/**
	 * Get blog category by ID
	 */
	public async getCategoryById(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const {language} = req.query

			const category = await this.blogService.getCategoryById(id, language as string | undefined)
			if (!category) {
				res.status(404).json({error: "Category not found"})
				return
			}

			res.json(category)
		} catch (error) {
			logger.error("Error getting blog category:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid category ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to get blog category"})
		}
	}

	/**
	 * Update blog category
	 */
	public async updateCategory(req: Request<{id: string}, {}, UpdateCategoryRequest>, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const {translations} = req.body

			const category = await this.blogService.updateCategory(id, translations)
			res.json(category)
		} catch (error) {
			logger.error("Error updating blog category:", error)
			if (error instanceof Error) {
				if (error.message === "Category not found") {
					res.status(404).json({error: "Category not found"})
					return
				}
			}
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2002") {
					res.status(409).json({error: "Category with this name already exists"})
					return
				}
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid category ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to update blog category"})
		}
	}

	/**
	 * Delete blog category
	 */
	public async deleteCategory(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			await this.blogService.deleteCategory(id)
			res.status(204).send()
		} catch (error) {
			logger.error("Error deleting blog category:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2025") {
					res.status(404).json({error: "Category not found"})
					return
				}
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid category ID format"})
					return
				}
				if (error.code === "P2003") {
					res.status(409).json({error: "Cannot delete category with associated blog posts"})
					return
				}
			}
			res.status(500).json({error: "Failed to delete blog category"})
		}
	}

	/**
	 * List blog posts with enhanced validation and error handling
	 */
	public async listPosts(req: Request, res: Response): Promise<Response | void> {
		try {
			const validationErrors: Record<string, string> = {}
			const {
				page = 1,
				limit = 10,
				category_id,
				author_id,
				status,
				language,
				start_date,
				end_date,
				sort_by,
				sort_direction,
				search,
			} = req.query

			// Initialize with default values
			const validatedFilters: BlogListFilters = {
				page: 1,
				limit: 10,
			}

			// Validate pagination parameters
			const parsedPage = Number(page)
			const parsedLimit = Number(limit)

			if (isNaN(parsedPage) || parsedPage < 1) {
				validationErrors.page = "Page must be a positive number"
			} else {
				validatedFilters.page = parsedPage
			}

			if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
				validationErrors.limit = "Limit must be between 1 and 100"
			} else {
				validatedFilters.limit = parsedLimit
			}

			// Validate UUID format for IDs
			if (category_id) {
				if (this.isValidUUID(category_id as string)) {
					validatedFilters.category_id = category_id as string
				} else {
					validationErrors.category_id = "Invalid category ID format"
				}
			}

			if (author_id) {
				if (this.isValidUUID(author_id as string)) {
					validatedFilters.author_id = author_id as string
				} else {
					validationErrors.author_id = "Invalid author ID format"
				}
			}

			// Validate status
			if (status) {
				if (Object.values(BlogStatus).includes(status as BlogStatus)) {
					validatedFilters.status = status as BlogStatus
				} else {
					validationErrors.status = `Invalid status. Must be one of: ${Object.values(BlogStatus).join(", ")}`
				}
			}

			// Validate language
			if (language) {
				if (typeof language === "string" && language.length === 2) {
					validatedFilters.language = language
				} else {
					validationErrors.language = "Language must be a 2-character ISO code"
				}
			}

			// Validate dates
			if (start_date) {
				const parsedStartDate = new Date(start_date as string)
				if (!isNaN(parsedStartDate.getTime())) {
					validatedFilters.start_date = parsedStartDate
				} else {
					validationErrors.start_date = "Invalid start date format"
				}
			}

			if (end_date) {
				const parsedEndDate = new Date(end_date as string)
				if (!isNaN(parsedEndDate.getTime())) {
					validatedFilters.end_date = parsedEndDate
				} else {
					validationErrors.end_date = "Invalid end date format"
				}
			}

			// Validate date range
			if (validatedFilters.start_date && validatedFilters.end_date) {
				if (validatedFilters.start_date > validatedFilters.end_date) {
					validationErrors.date_range = "Start date must be before end date"
				}
			}

			// Validate sort parameters
			if (sort_by) {
				if (["created_at", "view_count", "reading_time"].includes(sort_by as string)) {
					validatedFilters.sort_by = sort_by as "created_at" | "view_count" | "reading_time"
				} else {
					validationErrors.sort_by =
						"Invalid sort field. Must be one of: created_at, view_count, reading_time"
				}
			}

			if (sort_direction) {
				if (["asc", "desc"].includes(sort_direction as string)) {
					validatedFilters.sort_direction = sort_direction as "asc" | "desc"
				} else {
					validationErrors.sort_direction = "Sort direction must be either 'asc' or 'desc'"
				}
			}

			// Sanitize and validate search input
			if (search) {
				if (typeof search === "string") {
					const sanitizedSearch = this.sanitizeSearchInput(search)
					if (sanitizedSearch.length >= 2) {
						validatedFilters.search = sanitizedSearch
					} else {
						validationErrors.search = "Search term must be at least 2 characters long"
					}
				} else {
					validationErrors.search = "Search term must be a string"
				}
			}

			// Return validation errors if any
			if (Object.keys(validationErrors).length > 0) {
				logger.warn("Blog list validation errors:", {
					errors: validationErrors,
					requestParams: req.query,
					userId: req.user?.id,
				})
				return res.status(400).json({
					error: "Validation failed",
					details: validationErrors,
				})
			}

			// Start performance monitoring
			const startTime = process.hrtime()

			const result = await this.blogService.listPosts(validatedFilters)

			// Calculate query execution time
			const endTime = process.hrtime(startTime)
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)

			// Log performance metrics
			logger.info("Blog list query performance", {
				executionTime: `${executionTime}ms`,
				filters: validatedFilters,
				resultCount: result.total,
				userId: req.user?.id,
			})

			res.json(result)
		} catch (error) {
			logger.error("Error listing blog posts:", {
				error,
				query: req.query,
				userId: req.user?.id,
			})

			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				res.status(400).json({
					error: "Database query error",
					code: error.code,
					message: this.getPrismaErrorMessage(error),
				})
				return
			}

			res.status(500).json({
				error: "Failed to list blog posts",
				message: error instanceof Error ? error.message : "Unknown error occurred",
			})
		}
	}

	/**
	 * Sanitize search input to prevent injection and ensure valid search terms
	 */
	private sanitizeSearchInput(search: string): string {
		// Remove any potential SQL/NoSQL injection characters
		const sanitized = search
			.trim()
			.replace(/[<>{}()[\]\\\/]/g, "")
			.replace(/\s+/g, " ")

		// Limit length to prevent excessive long searches
		return sanitized.slice(0, 100)
	}

	/**
	 * Get human-readable Prisma error messages
	 */
	private getPrismaErrorMessage(error: Prisma.PrismaClientKnownRequestError): string {
		switch (error.code) {
			case "P2002":
				return "A unique constraint would be violated."
			case "P2003":
				return "Foreign key constraint failed."
			case "P2025":
				return "Record not found."
			default:
				return "An unexpected database error occurred."
		}
	}

	private isValidUUID(uuid: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		return uuidRegex.test(uuid)
	}

	/**
	 * Create blog post
	 */
	public async createPost(req: Request<{}, {}, CreateBlogPostRequest>, res: Response): Promise<void> {
		try {
			if (!req.user) {
				res.status(401).json({error: "Authentication required"})
				return
			}

			const post = await this.blogService.createPost(req.user.id, req.body)
			res.status(201).json(post)
		} catch (error) {
			logger.error("Error creating blog post:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2003") {
					res.status(400).json({error: "Invalid category ID"})
					return
				}
			}
			res.status(500).json({error: "Failed to create blog post"})
		}
	}

	/**
	 * Get blog post by ID
	 */
	public async getPostById(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const {language} = req.query

			const post = await this.blogService.getPostById(id, language as string)
			if (!post) {
				res.status(404).json({error: "Post not found"})
				return
			}

			res.json(post)
		} catch (error) {
			logger.error("Error getting blog post:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid post ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to get blog post"})
		}
	}

	/**
	 * Update blog post
	 */
	public async updatePost(req: Request<{id: string}, {}, UpdateBlogPostRequest>, res: Response): Promise<void> {
		try {
			const {id} = req.params

			if (!req.user) {
				res.status(401).json({error: "Authentication required"})
				return
			}

			const post = await this.blogService.getPostById(id)
			if (!post) {
				res.status(404).json({error: "Post not found"})
				return
			}

			// Only author or admin can update post
			if (post.author_id !== req.user.id && req.user.role !== UserRole.ADMIN) {
				res.status(403).json({error: "Insufficient permissions"})
				return
			}

			const updatedPost = await this.blogService.updatePost(id, req.user.id, req.body)
			res.json(updatedPost)
		} catch (error) {
			logger.error("Error updating blog post:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid post ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to update blog post"})
		}
	}

	/**
	 * Delete blog post
	 */
	public async deletePost(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params

			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					details: "You must be logged in to delete a blog post",
				})
				return
			}

			const post = await this.blogService.getPostById(id)
			if (!post) {
				res.status(404).json({
					error: "Blog post not found",
					details: {
						id: req.params.id,
						message: "The requested blog post does not exist or has already been deleted",
					},
				})
				return
			}

			// Only author or admin can delete post
			if (post.author_id !== req.user.id && req.user.role !== UserRole.ADMIN) {
				res.status(403).json({
					error: "Insufficient permissions",
					details: {
						required_role: "ADMIN",
						message: "Only the post author or an administrator can delete this post",
					},
				})
				return
			}

			const result = await this.blogService.deletePost(id)
			res.json(result)
		} catch (error) {
			logger.error("Error deleting blog post:", error)
			if (error instanceof Error) {
				if (error.message === "Blog post not found") {
					res.status(404).json({
						error: "Blog post not found",
						details: {
							id: req.params.id,
							message: "The requested blog post does not exist or has already been deleted",
						},
					})
					return
				}
				if (error.message.includes("Invalid")) {
					res.status(400).json({
						error: "Invalid request",
						details: {
							message: error.message,
						},
					})
					return
				}
			}
			res.status(500).json({
				error: "Failed to delete blog post",
				details: error instanceof Error ? error.message : "Unknown error occurred",
			})
		}
	}

	/**
	 * Get comments for a blog post
	 */
	public async getPostComments(req: Request, res: Response): Promise<void> {
		try {
			const {postId} = req.params
			const {page = 1, limit = 10} = req.query
			const skip = (Number(page) - 1) * Number(limit)
			const take = Number(limit)

			const comments = await this.blogService.getPostComments(postId, {
				skip,
				take,
				where: {
					status: CommentStatus.APPROVED, // Only return approved comments for public view
				},
			})

			res.json(comments)
		} catch (error) {
			logger.error("Error getting post comments:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid post ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to get post comments"})
		}
	}

	/**
	 * Create a new comment
	 */
	public async createComment(req: Request<{postId: string}, {}, CreateCommentRequest>, res: Response): Promise<void> {
		try {
			const {postId} = req.params
			const {content, guest_name, reply_to} = req.body

			const comment = await this.blogService.createComment({
				post_id: postId,
				content,
				guest_name,
				reply_to,
				status: CommentStatus.PENDING, // All guest comments start as pending
			})

			res.status(201).json(comment)
		} catch (error) {
			logger.error("Error creating comment:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid post or reply comment ID format"})
					return
				}
				if (error.code === "P2003") {
					res.status(404).json({error: "Blog post not found"})
					return
				}
			}
			res.status(500).json({error: "Failed to create comment"})
		}
	}

	/**
	 * Update comment
	 */
	public async updateComment(req: Request<{id: string}, {}, UpdateCommentRequest>, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const {content} = req.body

			if (!req.user) {
				res.status(401).json({error: "Authentication required"})
				return
			}

			const comment = await this.blogService.updateComment(id, content)
			res.json(comment)
		} catch (error) {
			logger.error("Error updating comment:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2025") {
					res.status(404).json({error: "Comment not found"})
					return
				}
			}
			res.status(500).json({error: "Failed to update comment"})
		}
	}

	/**
	 * Moderate comment
	 */
	public async moderateComment(req: Request<{id: string}, {}, ModerateCommentRequest>, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const {status} = req.body

			if (!req.user) {
				res.status(401).json({error: "Authentication required"})
				return
			}

			// Only admins can moderate comments
			if (req.user.role !== UserRole.ADMIN) {
				res.status(403).json({error: "Insufficient permissions"})
				return
			}

			const comment = await this.blogService.moderateComment(id, status)
			res.json(comment)
		} catch (error) {
			logger.error("Error moderating comment:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2025") {
					res.status(404).json({error: "Comment not found"})
					return
				}
			}
			res.status(500).json({error: "Failed to moderate comment"})
		}
	}

	/**
	 * Delete comment
	 */
	public async deleteComment(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params

			if (!req.user) {
				res.status(401).json({error: "Authentication required"})
				return
			}

			await this.blogService.deleteComment(id)
			res.status(204).send()
		} catch (error) {
			logger.error("Error deleting comment:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2025") {
					res.status(404).json({error: "Comment not found"})
					return
				}
			}
			res.status(500).json({error: "Failed to delete comment"})
		}
	}
}
