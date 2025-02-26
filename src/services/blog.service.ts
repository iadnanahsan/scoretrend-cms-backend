import {
	BlogCategory,
	BlogPost,
	Comment,
	PaginatedResponse,
	BlogListFilters,
	CreateBlogPostRequest,
	UpdateBlogPostRequest,
} from "../types/blog.types"
import {BlogStatus, CommentStatus, Prisma} from "@prisma/client"
import prisma from "../lib/prisma"
import logger from "../utils/logger"
import {LanguageService} from "./language.service"

export class BlogService {
	private readonly WORDS_PER_MINUTE = 200 // Average reading speed

	/**
	 * Create a new blog category
	 */
	async createCategory(translations: BlogCategory["translations"]): Promise<BlogCategory> {
		try {
			const category = await prisma.blogCategory.create({
				data: {
					translations: {
						create: Object.entries(translations).map(([language, translation]) => ({
							language,
							...translation,
						})),
					},
				},
				include: {
					translations: true,
				},
			})

			return this.formatCategory(category)
		} catch (error) {
			logger.error("Error creating blog category:", error)
			throw error
		}
	}

	/**
	 * Get blog category by ID
	 */
	async getCategoryById(id: string, language?: string): Promise<BlogCategory | null> {
		try {
			const category = await prisma.blogCategory.findUnique({
				where: {id},
				include: {
					translations: language
						? {
								where: {language},
						  }
						: true,
				},
			})

			if (!category) {
				return null
			}

			return this.formatCategory(category)
		} catch (error) {
			logger.error("Error getting blog category:", error)
			throw error
		}
	}

	/**
	 * List blog categories with pagination
	 */
	async listCategories(params: {
		skip?: number
		take?: number
		language?: string
	}): Promise<PaginatedResponse<BlogCategory>> {
		try {
			const [categories, total] = await Promise.all([
				prisma.blogCategory.findMany({
					skip: params.skip,
					take: params.take,
					include: {
						translations: params.language
							? {
									where: {language: params.language},
							  }
							: true,
					},
					orderBy: {
						created_at: "desc",
					},
				}),
				prisma.blogCategory.count(),
			])

			const formattedCategories = categories.map((category) => this.formatCategory(category))
			const limit = params.take || 10
			const pages = Math.ceil(total / limit)

			return {
				items: formattedCategories,
				total,
				page: Math.floor((params.skip || 0) / limit) + 1,
				limit,
				pages,
			}
		} catch (error) {
			logger.error("Error listing blog categories:", error)
			throw error
		}
	}

	/**
	 * Update blog category
	 */
	async updateCategory(id: string, translations: BlogCategory["translations"]): Promise<BlogCategory> {
		try {
			// Get existing category
			const existingCategory = await prisma.blogCategory.findUnique({
				where: {id},
				include: {
					translations: true,
				},
			})

			if (!existingCategory) {
				throw new Error("Category not found")
			}

			// Update category with translations
			const category = await prisma.blogCategory.update({
				where: {id},
				data: {
					translations: {
						deleteMany: {},
						create: Object.entries(translations).map(([language, translation]) => ({
							language,
							...translation,
						})),
					},
				},
				include: {
					translations: true,
				},
			})

			return this.formatCategory(category)
		} catch (error) {
			logger.error("Error updating blog category:", error)
			throw error
		}
	}

	/**
	 * Delete blog category
	 */
	async deleteCategory(id: string): Promise<void> {
		try {
			await prisma.blogCategory.delete({
				where: {id},
			})
		} catch (error) {
			logger.error("Error deleting blog category:", error)
			throw error
		}
	}

	/**
	 * Format category response
	 */
	private formatCategory(
		category: Prisma.BlogCategoryGetPayload<{
			include: {
				translations: true
			}
		}>
	): BlogCategory {
		const translations = category.translations.reduce((acc, translation) => {
			acc[translation.language] = {
				name: translation.name,
				description: translation.description || undefined,
			}
			return acc
		}, {} as BlogCategory["translations"])

		return {
			id: category.id,
			translations,
			created_at: category.created_at,
			updated_at: category.updated_at,
		}
	}

	/**
	 * Increment view count for a blog post
	 */
	async incrementViewCount(id: string): Promise<void> {
		try {
			await prisma.blogPost.update({
				where: {id},
				data: {
					view_count: {
						increment: 1,
					},
				},
			})
		} catch (error) {
			logger.error("Error incrementing view count:", error)
			throw error
		}
	}

	/**
	 * Calculate reading time for blog post content
	 */
	private calculateReadingTime(content: string): number {
		// Count words in content (split by whitespace)
		const words = content.trim().split(/\s+/).length

		// Calculate minutes rounded up to nearest minute
		return Math.ceil(words / this.WORDS_PER_MINUTE)
	}

	/**
	 * Get blog post by ID with view count tracking
	 */
	async getPostById(id: string, language?: string, shouldTrackView: boolean = true): Promise<BlogPost | null> {
		try {
			const post = await prisma.blogPost.findUnique({
				where: {id},
				include: {
					translations: language
						? {
								where: {language},
						  }
						: true,
					author: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					category: {
						include: {
							translations: true,
						},
					},
				},
			})

			if (!post) {
				return null
			}

			// Track view if requested and post is published
			if (shouldTrackView && post.status === BlogStatus.PUBLISHED) {
				await this.incrementViewCount(id).catch((error) => {
					// Log error but don't fail the request
					logger.error("Failed to increment view count:", error)
				})
			}

			// Calculate reading time if not already set
			if (!post.reading_time && post.translations.length > 0) {
				const content = post.translations[0].content // Use first translation for calculation
				const readingTime = this.calculateReadingTime(content)

				// Update reading time in database
				await prisma.blogPost
					.update({
						where: {id},
						data: {reading_time: readingTime},
					})
					.catch((error) => {
						// Log error but don't fail the request
						logger.error("Failed to update reading time:", error)
					})

				post.reading_time = readingTime
			}

			return this.formatPost(post)
		} catch (error) {
			logger.error("Error getting blog post:", error)
			throw error
		}
	}

	/**
	 * Create a new blog post with reading time calculation
	 */
	async createPost(authorId: string, data: CreateBlogPostRequest): Promise<BlogPost> {
		try {
			// Calculate reading time from first translation's content
			const firstTranslation = Object.values(data.translations)[0]
			const readingTime = this.calculateReadingTime(firstTranslation.content)

			const post = await prisma.blogPost.create({
				data: {
					category_id: data.category_id,
					author_id: authorId,
					status: BlogStatus.DRAFT,
					thumbnail_url: data.thumbnail_url,
					cover_url: data.cover_url,
					reading_time: readingTime,
					translations: {
						create: Object.entries(data.translations).map(([language, translation]) => ({
							language,
							title: translation.title,
							content: translation.content,
							alias: translation.alias,
							seo_data: translation.seo ? JSON.parse(JSON.stringify(translation.seo)) : null,
						})),
					},
				},
				include: {
					translations: true,
					author: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					category: {
						include: {
							translations: true,
						},
					},
				},
			})

			return this.formatPost(post)
		} catch (error) {
			logger.error("Error creating blog post:", error)
			throw error
		}
	}

	/**
	 * Update blog post with reading time recalculation
	 */
	async updatePost(id: string, userId: string, data: UpdateBlogPostRequest): Promise<BlogPost> {
		try {
			// Calculate new reading time if content is being updated
			let readingTime: number | undefined
			if (data.translations) {
				const firstTranslation = Object.values(data.translations)[0]
				readingTime = this.calculateReadingTime(firstTranslation.content)
			}

			const post = await prisma.blogPost.update({
				where: {id},
				data: {
					category_id: data.category_id,
					status: data.status,
					thumbnail_url: data.thumbnail_url,
					cover_url: data.cover_url,
					reading_time: readingTime,
					updated_by_id: userId,
					translations: data.translations
						? {
								deleteMany: {},
								create: Object.entries(data.translations).map(([language, translation]) => ({
									language,
									title: translation.title,
									content: translation.content,
									alias: translation.alias,
									seo_data: translation.seo ? JSON.parse(JSON.stringify(translation.seo)) : null,
								})),
						  }
						: undefined,
				},
				include: {
					translations: true,
					author: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					category: {
						include: {
							translations: true,
						},
					},
				},
			})

			return this.formatPost(post)
		} catch (error) {
			logger.error("Error updating blog post:", error)
			throw error
		}
	}

	/**
	 * List blog posts with enhanced filtering and sorting
	 */
	async listPosts(filters: BlogListFilters): Promise<PaginatedResponse<BlogPost>> {
		try {
			// Build where clause
			const where: Prisma.BlogPostWhereInput = {}

			// Category filter
			if (filters.category_id) {
				where.category_id = filters.category_id
			}

			// Author filter
			if (filters.author_id) {
				where.author_id = filters.author_id
			}

			// Status filter
			if (filters.status) {
				where.status = filters.status
			}

			// Date range filters
			if (filters.start_date || filters.end_date) {
				where.created_at = {
					...(filters.start_date && {gte: filters.start_date}),
					...(filters.end_date && {lte: filters.end_date}),
				}
			}

			// Search filter
			if (filters.search) {
				where.translations = {
					some: {
						OR: [
							{title: {contains: filters.search, mode: "insensitive"}},
							{content: {contains: filters.search, mode: "insensitive"}},
						],
					},
				}
			}

			// Build orderBy
			let orderBy: Prisma.BlogPostOrderByWithRelationInput = {
				created_at: filters.sort_direction || "desc",
			}

			if (filters.sort_by) {
				switch (filters.sort_by) {
					case "created_at":
						orderBy = {created_at: filters.sort_direction || "desc"}
						break
					case "view_count":
						orderBy = {view_count: filters.sort_direction || "desc"}
						break
					case "reading_time":
						orderBy = {reading_time: filters.sort_direction || "desc"}
						break
				}
			}

			// Execute query with pagination
			const [posts, total] = await Promise.all([
				prisma.blogPost.findMany({
					where,
					skip: ((filters.page || 1) - 1) * (filters.limit || 10),
					take: filters.limit || 10,
					include: {
						translations: filters.language
							? {
									where: {language: filters.language},
							  }
							: true,
						author: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						category: {
							include: {
								translations: true,
							},
						},
					},
					orderBy,
				}),
				prisma.blogPost.count({where}),
			])

			const formattedPosts = posts.map((post) => this.formatPost(post))
			const limit = filters.limit || 10
			const pages = Math.ceil(total / limit)

			return {
				items: formattedPosts,
				total,
				page: filters.page || 1,
				limit,
				pages,
			}
		} catch (error) {
			logger.error("Error listing blog posts:", error)
			throw error
		}
	}

	/**
	 * Delete blog post and all related data
	 * @returns Detailed information about the deleted post
	 */
	async deletePost(id: string): Promise<{
		message: string
		deleted_post: {
			id: string
			title: string
			category: string
			author: string
			translations_deleted: number
		}
	}> {
		try {
			// First check if the post exists with all necessary details
			const post = await prisma.blogPost.findUnique({
				where: {id},
				include: {
					translations: true,
					comments: true,
					author: {
						select: {
							name: true,
						},
					},
					category: {
						include: {
							translations: true,
						},
					},
				},
			})

			if (!post) {
				throw new Error("Blog post not found")
			}

			// Prepare response data before deletion
			const responseData = {
				message: "Blog post deleted successfully.",
				deleted_post: {
					id: post.id,
					title: post.translations[0]?.title || "Untitled",
					category: post.category?.translations[0]?.name || "Uncategorized",
					author: post.author?.name || "Unknown Author",
					translations_deleted: post.translations.length,
				},
			}

			// Use a transaction to ensure all related data is deleted
			await prisma.$transaction(async (tx) => {
				// Delete all translations first
				if (post.translations.length > 0) {
					await tx.postTranslation.deleteMany({
						where: {post_id: id},
					})
				}

				// Delete all comments
				if (post.comments.length > 0) {
					await tx.comment.deleteMany({
						where: {post_id: id},
					})
				}

				// Finally delete the post
				await tx.blogPost.delete({
					where: {id},
				})
			})

			return responseData
		} catch (error) {
			logger.error("Error deleting blog post:", error)
			if (error instanceof Error) {
				if (error.message === "Blog post not found") {
					throw error
				}
			}
			throw new Error("Failed to delete blog post")
		}
	}

	/**
	 * Format post response
	 */
	private formatPost(
		post: Prisma.BlogPostGetPayload<{
			include: {
				translations: true
				author: {
					select: {
						id: true
						name: true
						email: true
					}
				}
				category: {
					include: {
						translations: true
					}
				}
			}
		}>
	): BlogPost {
		const translations = post.translations.reduce((acc, translation) => {
			acc[translation.language] = {
				title: translation.title,
				content: translation.content,
				alias: translation.alias,
				seo: translation.seo_data as any,
			}
			return acc
		}, {} as BlogPost["translations"])

		// Get category name from translations (use first available translation)
		const categoryName = post.category?.translations[0]?.name || "Uncategorized"

		return {
			id: post.id,
			category_id: post.category_id,
			category_name: categoryName,
			author_id: post.author_id,
			author_name: post.author?.name || "Unknown Author",
			status: post.status,
			thumbnail_url: post.thumbnail_url || undefined,
			cover_url: post.cover_url || undefined,
			view_count: post.view_count,
			reading_time: post.reading_time || undefined,
			translations,
			created_at: post.created_at,
			updated_at: post.updated_at,
			updated_by_id: post.updated_by_id || undefined,
		}
	}

	// Comment Management Methods

	/**
	 * Create a new comment
	 */
	async createComment(data: {
		post_id: string
		content: string
		guest_name: string
		reply_to?: string
		status?: CommentStatus
	}): Promise<Comment> {
		try {
			const comment = await prisma.comment.create({
				data: {
					post_id: data.post_id,
					content: data.content,
					guest_name: data.guest_name,
					reply_to: data.reply_to,
					status: data.status || CommentStatus.PENDING,
				},
				include: {
					post: {
						select: {
							id: true,
							translations: {
								select: {
									title: true,
								},
							},
						},
					},
				},
			})

			return {
				id: comment.id,
				post_id: comment.post_id,
				content: comment.content,
				guest_name: comment.guest_name,
				reply_to: comment.reply_to,
				status: comment.status,
				created_at: comment.created_at,
				updated_at: comment.updated_at,
			}
		} catch (error) {
			logger.error("Error creating comment:", error)
			throw error
		}
	}

	/**
	 * Get comments for a blog post with pagination
	 */
	async getPostComments(
		postId: string,
		params: {
			skip?: number
			take?: number
			where?: {
				status?: CommentStatus
			}
		}
	): Promise<PaginatedResponse<Comment>> {
		try {
			const [comments, total] = await Promise.all([
				prisma.comment.findMany({
					where: {
						post_id: postId,
						...params.where,
					},
					skip: params.skip,
					take: params.take,
					orderBy: {
						created_at: "desc",
					},
					include: {
						post: {
							select: {
								id: true,
								translations: {
									select: {
										title: true,
									},
								},
							},
						},
					},
				}),
				prisma.comment.count({
					where: {
						post_id: postId,
						...params.where,
					},
				}),
			])

			const formattedComments = comments.map((comment) => ({
				id: comment.id,
				post_id: comment.post_id,
				content: comment.content,
				guest_name: comment.guest_name || undefined,
				reply_to: comment.reply_to || undefined,
				status: comment.status,
				created_at: comment.created_at,
				updated_at: comment.updated_at,
			}))

			const limit = params.take || 10
			const pages = Math.ceil(total / limit)

			return {
				items: formattedComments,
				total,
				page: Math.floor((params.skip || 0) / limit) + 1,
				limit,
				pages,
			}
		} catch (error) {
			logger.error("Error getting post comments:", error)
			throw error
		}
	}

	/**
	 * Update comment
	 */
	async updateComment(id: string, content: string): Promise<Comment> {
		try {
			const comment = await prisma.comment.update({
				where: {id},
				data: {content},
			})

			return {
				id: comment.id,
				post_id: comment.post_id,
				user_id: comment.user_id || undefined,
				reply_to: comment.reply_to || undefined,
				content: comment.content,
				status: comment.status,
				created_at: comment.created_at,
				updated_at: comment.updated_at,
			}
		} catch (error) {
			logger.error("Error updating comment:", error)
			throw error
		}
	}

	/**
	 * Moderate comment
	 */
	async moderateComment(id: string, status: CommentStatus): Promise<Comment> {
		try {
			const comment = await prisma.comment.update({
				where: {id},
				data: {status},
			})

			return {
				id: comment.id,
				post_id: comment.post_id,
				user_id: comment.user_id || undefined,
				reply_to: comment.reply_to || undefined,
				content: comment.content,
				status: comment.status,
				created_at: comment.created_at,
				updated_at: comment.updated_at,
			}
		} catch (error) {
			logger.error("Error moderating comment:", error)
			throw error
		}
	}

	/**
	 * Delete comment
	 */
	async deleteComment(id: string): Promise<void> {
		try {
			await prisma.comment.delete({
				where: {id},
			})
		} catch (error) {
			logger.error("Error deleting comment:", error)
			throw error
		}
	}
}
