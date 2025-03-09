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
	 * List blog categories with pagination and search
	 */
	async listCategories(params: {
		skip?: number
		take?: number
		language?: string
		search?: string
	}): Promise<PaginatedResponse<BlogCategory>> {
		try {
			// Build where clause for search
			const where: Prisma.BlogCategoryWhereInput = {}

			// Add search functionality
			if (params.search) {
				where.translations = {
					some: {
						OR: [
							{name: {contains: params.search, mode: "insensitive"}},
							{description: {contains: params.search, mode: "insensitive"}},
						],
					},
				}
			}

			const [categories, total] = await Promise.all([
				prisma.blogCategory.findMany({
					skip: params.skip,
					take: params.take,
					where,
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
				prisma.blogCategory.count({where}),
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
	 * Check if view should be tracked based on cookies and IP
	 * Prevents duplicate views from the same user within a time period
	 */
	shouldTrackView(id: string, req: any): boolean {
		// Skip tracking for authenticated users
		if (req.user) {
			return false
		}

		const clientIp = req.ip || "unknown"
		const now = new Date().getTime()

		// Check if we have a cookie for this post
		const viewedPosts = req.cookies.viewedPosts ? JSON.parse(req.cookies.viewedPosts) : {}

		// If this post was viewed recently (within 6 hours), don't count it
		if (viewedPosts[id] && now - viewedPosts[id] < 6 * 60 * 60 * 1000) {
			return false
		}

		// Otherwise, track the view
		return true
	}

	/**
	 * Set cookie to track viewed post
	 */
	setViewedCookie(id: string, res: any): void {
		const now = new Date().getTime()
		const viewedPosts = res.req.cookies.viewedPosts ? JSON.parse(res.req.cookies.viewedPosts) : {}

		// Update the timestamp for this post
		viewedPosts[id] = now

		// Set cookie to expire in 7 days
		res.cookie("viewedPosts", JSON.stringify(viewedPosts), {
			maxAge: 7 * 24 * 60 * 60 * 1000,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
		})
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
	async getPostById(
		id: string,
		language?: string,
		shouldTrackView: boolean = true,
		isAuthenticated: boolean = false,
		req?: any,
		res?: any
	): Promise<BlogPost | null> {
		try {
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			// Add detailed debug logging
			logger.debug(`[BlogService.getPostById] Looking up post with ID: ${normalizedId}`)

			// Build query conditions
			const query = {
				where: {id: normalizedId},
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
					comments: {
						where: {
							status: CommentStatus.APPROVED,
						},
						select: {
							id: true,
						},
					},
				},
			}

			logger.debug(`[BlogService.getPostById] Query:`, JSON.stringify(query))

			// Get the post
			const post = await prisma.blogPost.findUnique(query)

			logger.debug(`[BlogService.getPostById] Database result:`, post ? "Post found" : "Post not found")

			// Try a simpler query if post not found
			if (!post) {
				logger.debug(`[BlogService.getPostById] Post not found, trying simpler query`)
				const simplePost = await prisma.blogPost.findUnique({
					where: {id: normalizedId},
					select: {id: true},
				})
				logger.debug(`[BlogService.getPostById] Simple query result:`, simplePost)
			}

			// If post doesn't exist or is draft and user is not authenticated, return null
			if (!post || (!isAuthenticated && post.status !== BlogStatus.PUBLISHED)) {
				logger.debug(
					`[BlogService.getPostById] Returning null. Post exists: ${!!post}, Status: ${
						post?.status
					}, isAuthenticated: ${isAuthenticated}`
				)
				return null
			}

			// Get author details
			let authorDetail = null
			if (post.author_id) {
				authorDetail = await prisma.authorDetail.findUnique({
					where: {user_id: post.author_id},
					include: {
						translations: language ? {where: {language}} : true,
					},
				})
			}

			// Track view if requested, post is published, and we have req/res objects for cookie tracking
			if (shouldTrackView && post.status === BlogStatus.PUBLISHED) {
				// If we have req/res objects, use cookie tracking
				if (req && res && this.shouldTrackView(id, req)) {
					await this.incrementViewCount(id).catch((error) => {
						// Log error but don't fail the request
						logger.error("Failed to increment view count:", error)
					})

					// Set cookie to prevent duplicate views
					this.setViewedCookie(id, res)
				} else if (!req && !res) {
					// Legacy behavior without cookie tracking
					await this.incrementViewCount(id).catch((error) => {
						// Log error but don't fail the request
						logger.error("Failed to increment view count:", error)
					})
				}
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

			const formattedPost = this.formatPost(post, authorDetail)
			// Add comments count
			formattedPost.comments_count = post.comments?.length || 0
			return formattedPost
		} catch (error) {
			logger.error("Error getting blog post:", error)
			throw error
		}
	}

	/**
	 * Check if a blog post exists by ID
	 */
	async checkPostExists(id: string): Promise<boolean> {
		try {
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			const post = await prisma.blogPost.findUnique({
				where: {id: normalizedId},
				select: {id: true},
			})

			return !!post
		} catch (error) {
			logger.error("Error checking if post exists:", error)
			return false
		}
	}

	/**
	 * Check if a comment exists by ID
	 */
	async checkCommentExists(id: string): Promise<boolean> {
		try {
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			const comment = await prisma.comment.findUnique({
				where: {id: normalizedId},
				select: {id: true},
			})

			return !!comment
		} catch (error) {
			logger.error("Error checking if comment exists:", error)
			return false
		}
	}

	/**
	 * Check if blog post alias is unique across all blog posts
	 */
	private async isAliasUnique(alias: string, language: string, postId?: string): Promise<boolean> {
		// Add detailed debug logging
		logger.debug(
			`[BlogService.isAliasUnique] Checking if alias "${alias}" is unique for language "${language}"${
				postId ? ` (excluding postId: ${postId})` : ""
			}`
		)

		// Find any post translation with the same alias (case insensitive)
		const existingTranslation = await prisma.postTranslation.findFirst({
			where: {
				alias: {
					equals: alias,
					mode: "insensitive", // Case-insensitive matching
				},
				language: language,
				// Exclude the current post translation if updating
				...(postId
					? {
							NOT: {
								post_id: postId,
							},
					  }
					: {}),
			},
			select: {
				id: true,
				post_id: true,
				language: true,
			},
		})

		// If we found a translation with this alias, it's not unique
		const isUnique = !existingTranslation

		logger.debug(`[BlogService.isAliasUnique] Alias "${alias}" is ${isUnique ? "unique" : "not unique"}`)
		if (!isUnique) {
			logger.debug(`[BlogService.isAliasUnique] Existing translation found:`, existingTranslation)
		}

		return isUnique
	}

	/**
	 * Validate and sanitize blog post alias
	 * - Replaces spaces with hyphens
	 * - Converts to lowercase
	 * - Ensures proper length (max 100 chars for blog posts)
	 * - Allows only alphanumeric, hyphens, and underscores
	 */
	private validateAlias(alias: string): string {
		if (!alias) {
			throw new Error("Alias is required")
		}

		// Replace spaces with hyphens and convert to lowercase
		let sanitizedAlias = alias.trim().replace(/\s+/g, "-").toLowerCase()

		// Remove any characters that aren't alphanumeric, hyphens, or underscores
		sanitizedAlias = sanitizedAlias.replace(/[^a-z0-9-_]/g, "")

		// Check length (max 100 chars for blog posts)
		const MAX_BLOG_ALIAS_LENGTH = 100
		if (sanitizedAlias.length > MAX_BLOG_ALIAS_LENGTH) {
			throw new Error(`Blog post alias cannot exceed ${MAX_BLOG_ALIAS_LENGTH} characters`)
		}

		// Ensure alias isn't empty after sanitization
		if (!sanitizedAlias) {
			throw new Error("Alias must contain at least one alphanumeric character")
		}

		return sanitizedAlias
	}

	/**
	 * Create blog post with author and translations
	 */
	async createPost(authorId: string, data: CreateBlogPostRequest): Promise<BlogPost> {
		try {
			// Validate and sanitize aliases for each translation
			for (const [language, translation] of Object.entries(data.translations)) {
				// Sanitize the alias
				const sanitizedAlias = this.validateAlias(translation.alias)
				translation.alias = sanitizedAlias

				// Check alias uniqueness
				const isUnique = await this.isAliasUnique(sanitizedAlias, language)
				if (!isUnique) {
					throw new Error(
						`Blog post alias "${sanitizedAlias}" already exists for language "${language}". Each blog post must have a unique alias within its language.`
					)
				}
			}

			// Calculate reading time based on first translation's content
			const firstTranslation = Object.values(data.translations)[0]
			const readingTime = this.calculateReadingTime(firstTranslation.content)

			// Add debug logging for status
			logger.debug(
				`[BlogService.createPost] Creating post with status: ${
					data.status !== undefined ? data.status : BlogStatus.DRAFT
				}`
			)

			const post = await prisma.blogPost.create({
				data: {
					category_id: data.category_id,
					author_id: authorId,
					status: data.status !== undefined ? data.status : BlogStatus.DRAFT,
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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			// Validate and sanitize aliases for each translation if translations are being updated
			if (data.translations) {
				for (const [language, translation] of Object.entries(data.translations)) {
					// Sanitize the alias
					const sanitizedAlias = this.validateAlias(translation.alias)
					translation.alias = sanitizedAlias

					// Check alias uniqueness
					const isUnique = await this.isAliasUnique(sanitizedAlias, language, normalizedId)
					if (!isUnique) {
						throw new Error(
							`Blog post alias "${sanitizedAlias}" already exists for language "${language}". Each blog post must have a unique alias within its language.`
						)
					}
				}
			}

			// Calculate new reading time if content is being updated
			let readingTime: number | undefined
			if (data.translations) {
				const firstTranslation = Object.values(data.translations)[0]
				readingTime = this.calculateReadingTime(firstTranslation.content)
			}

			const post = await prisma.blogPost.update({
				where: {id: normalizedId},
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
	async listPosts(filters: BlogListFilters, isAuthenticated: boolean = false): Promise<PaginatedResponse<BlogPost>> {
		try {
			logger.debug("Listing blog posts with filters:", {filters, isAuthenticated})

			// Build the where clause with pagination
			let where: Prisma.BlogPostWhereInput = {}

			if (!isAuthenticated) {
				where.status = BlogStatus.PUBLISHED
			} else if (filters.status) {
				where.status = filters.status
			}

			if (filters.category_id) {
				where.category_id = filters.category_id
			}

			if (filters.author_id) {
				where.author_id = filters.author_id
			}

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

			// Flag to check if we need to include pending comments count
			const includePendingCount = filters.include_pending_comments === true

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
						comments: {
							where: {
								status: CommentStatus.APPROVED,
							},
							select: {
								id: true,
							},
						},
						// Include pending comments count if requested (for admin users)
						...(includePendingCount
							? {
									_count: {
										select: {
											comments: {
												where: {
													status: CommentStatus.PENDING,
												},
											},
										},
									},
							  }
							: {}),
					},
					orderBy,
				}),
				prisma.blogPost.count({where}),
			])

			const formattedPosts = posts.map((post) => {
				const formattedPost = this.formatPost(post)

				// Add comments count
				formattedPost.comments_count = post.comments?.length || 0

				// Add pending comments count if available
				if (includePendingCount && post._count?.comments !== undefined) {
					formattedPost.pending_comments_count = post._count.comments
				}

				return formattedPost
			})

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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			// First check if the post exists with all necessary details
			const post = await prisma.blogPost.findUnique({
				where: {id: normalizedId},
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
					where: {id: normalizedId},
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
		}>,
		authorDetail?: any
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

		// Format author details if available
		let author: {
			id: string
			name: string
			email?: string
			profile_image_url?: string
			translations?: {
				[language: string]: {
					name: string
					description?: string
				}
			}
		} = {
			id: post.author_id,
			name: post.author?.name || "Unknown Author",
			email: post.author?.email,
		}

		// Add author details if available
		if (authorDetail) {
			author = {
				...author,
				profile_image_url: authorDetail.profile_image_url,
				translations: authorDetail.translations.reduce((acc: any, translation: any) => {
					acc[translation.language] = {
						name: translation.name,
						description: translation.description,
					}
					return acc
				}, {}),
			}
		}

		return {
			id: post.id,
			category_id: post.category_id,
			category_name: categoryName,
			author_id: post.author_id,
			author_name: post.author?.name || "Unknown Author",
			author_details: author,
			status: post.status,
			thumbnail_url: post.thumbnail_url || undefined,
			cover_url: post.cover_url || undefined,
			view_count: post.view_count,
			reading_time: post.reading_time || undefined,
			comments_count: 0, // Default value, will be populated in listPosts and getPostById
			translations,
			created_at: post.created_at,
			updated_at: post.updated_at,
			updated_by_id: post.updated_by_id || undefined,
		} as BlogPost
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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedPostId = data.post_id.toLowerCase()
			// Also normalize reply_to if it exists
			const normalizedReplyTo = data.reply_to ? data.reply_to.toLowerCase() : undefined

			const comment = await prisma.comment.create({
				data: {
					post_id: normalizedPostId,
					content: data.content,
					guest_name: data.guest_name,
					reply_to: normalizedReplyTo,
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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = postId.toLowerCase()

			// Add debugging logs
			logger.debug(`getPostComments service - Post ID: ${normalizedId}`)
			logger.debug(`getPostComments service - Params: ${JSON.stringify(params)}`)

			// Build the where clause for the query
			const whereClause = {
				post_id: normalizedId,
				...params.where,
			}

			logger.debug(`getPostComments service - Where clause: ${JSON.stringify(whereClause)}`)

			const [comments, total] = await Promise.all([
				prisma.comment.findMany({
					where: whereClause,
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
					where: whereClause,
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
			const page = Math.floor((params.skip || 0) / limit) + 1

			logger.debug(`getPostComments service - Raw comments count: ${comments.length}`)
			logger.debug(`getPostComments service - Total count from DB: ${total}`)
			logger.debug(`getPostComments service - Pagination: page ${page}, limit ${limit}, pages ${pages}`)

			return {
				items: formattedComments,
				total,
				page: page,
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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			const comment = await prisma.comment.update({
				where: {id: normalizedId},
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
				guest_name: comment.guest_name || undefined,
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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			const comment = await prisma.comment.update({
				where: {id: normalizedId},
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
				guest_name: comment.guest_name || undefined,
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
			// Normalize UUID to lowercase to ensure case-insensitive matching
			const normalizedId = id.toLowerCase()

			await prisma.comment.delete({
				where: {id: normalizedId},
			})
		} catch (error) {
			logger.error("Error deleting comment:", error)
			throw error
		}
	}

	/**
	 * Get blog post by alias with view count tracking
	 */
	async getPostByAlias(
		alias: string,
		language: string,
		shouldTrackView: boolean = true,
		isAuthenticated: boolean = false,
		req?: any,
		res?: any
	): Promise<BlogPost | null> {
		try {
			// Validate language
			if (!language) {
				throw new Error("Language parameter is required")
			}

			// Add detailed debug logging
			logger.debug(`[BlogService.getPostByAlias] Looking up post with alias: ${alias} in language: ${language}`)

			// Find the post translation with the matching alias
			const postTranslation = await prisma.postTranslation.findFirst({
				where: {
					alias: {
						equals: alias,
						mode: "insensitive", // Case-insensitive matching
					},
					language: language,
				},
				include: {
					post: {
						include: {
							translations: {
								where: {
									language,
								},
							},
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
							comments: {
								where: {
									status: CommentStatus.APPROVED,
								},
								select: {
									id: true,
								},
							},
						},
					},
				},
			})

			logger.debug(
				`[BlogService.getPostByAlias] Database result:`,
				postTranslation ? "Post found" : "Post not found"
			)

			// If no post translation found or post is draft and user is not authenticated, return null
			if (!postTranslation || (!isAuthenticated && postTranslation.post.status !== BlogStatus.PUBLISHED)) {
				logger.debug(
					`[BlogService.getPostByAlias] Returning null. Post exists: ${!!postTranslation}, Status: ${
						postTranslation?.post.status
					}, isAuthenticated: ${isAuthenticated}`
				)
				return null
			}

			const post = postTranslation.post

			// Get author details
			let authorDetail = null
			if (post.author_id) {
				authorDetail = await prisma.authorDetail.findUnique({
					where: {user_id: post.author_id},
					include: {
						translations: language ? {where: {language}} : true,
					},
				})
			}

			// Track view if requested, post is published, and we have req/res objects for cookie tracking
			if (shouldTrackView && post.status === BlogStatus.PUBLISHED) {
				// If we have req/res objects, use cookie tracking
				if (req && res && this.shouldTrackView(post.id, req)) {
					await this.incrementViewCount(post.id).catch((error) => {
						// Log error but don't fail the request
						logger.error("Failed to increment view count:", error)
					})

					// Set cookie to prevent duplicate views
					this.setViewedCookie(post.id, res)
				} else if (!req && !res) {
					// Legacy behavior without cookie tracking
					await this.incrementViewCount(post.id).catch((error) => {
						// Log error but don't fail the request
						logger.error("Failed to increment view count:", error)
					})
				}
			}

			// Calculate reading time if not already set
			if (!post.reading_time && post.translations.length > 0) {
				const content = post.translations[0].content // Use first translation for calculation
				const readingTime = this.calculateReadingTime(content)

				// Update reading time in database
				await prisma.blogPost
					.update({
						where: {id: post.id},
						data: {reading_time: readingTime},
					})
					.catch((error) => {
						// Log error but don't fail the request
						logger.error("Failed to update reading time:", error)
					})

				post.reading_time = readingTime
			}

			const formattedPost = this.formatPost(post, authorDetail)
			// Add comments count
			formattedPost.comments_count = post.comments?.length || 0
			return formattedPost
		} catch (error) {
			logger.error("Error getting blog post by alias:", error)
			throw error
		}
	}

	/**
	 * Get all blog post aliases
	 * Returns a list of all blog post aliases with their corresponding post IDs and languages
	 */
	async getAllAliases(): Promise<Array<{alias: string; post_id: string; language: string; title: string}>> {
		try {
			const translations = await prisma.postTranslation.findMany({
				select: {
					alias: true,
					language: true,
					post_id: true,
					title: true,
				},
				orderBy: {
					language: "asc",
				},
			})

			// Format the response
			return translations.map(
				(translation: {alias: string; post_id: string; language: string; title: string}) => ({
					alias: translation.alias,
					post_id: translation.post_id,
					language: translation.language,
					title: translation.title,
				})
			)
		} catch (error) {
			logger.error("Error getting all blog post aliases:", error)
			throw new Error("Failed to get blog post aliases")
		}
	}

	/**
	 * Get all blog post aliases grouped by post
	 * Returns a list of posts with their translations grouped together
	 */
	async getGroupedAliases(): Promise<
		Array<{
			post_id: string
			translations: Array<{
				language: string
				alias: string
				title: string
			}>
		}>
	> {
		try {
			const translations = await prisma.postTranslation.findMany({
				select: {
					alias: true,
					language: true,
					post_id: true,
					title: true,
				},
				orderBy: [{post_id: "asc"}, {language: "asc"}],
			})

			// Group by post_id
			const groupedByPost = translations.reduce(
				(acc, translation) => {
					const postId = translation.post_id

					if (!acc[postId]) {
						acc[postId] = {
							post_id: postId,
							translations: [],
						}
					}

					acc[postId].translations.push({
						language: translation.language,
						alias: translation.alias,
						title: translation.title,
					})

					return acc
				},
				{} as Record<
					string,
					{
						post_id: string
						translations: Array<{
							language: string
							alias: string
							title: string
						}>
					}
				>
			)

			// Convert to array
			return Object.values(groupedByPost)
		} catch (error) {
			logger.error("Error getting grouped blog post aliases:", error)
			throw new Error("Failed to get grouped blog post aliases")
		}
	}
}
