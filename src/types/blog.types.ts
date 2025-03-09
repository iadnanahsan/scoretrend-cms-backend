import {BlogStatus, CommentStatus} from "@prisma/client"
import {SEOData} from "./page.types"

export interface CategoryTranslation {
	name: string
	description?: string
}

export interface BlogCategory {
	id: string
	translations: {
		[language: string]: CategoryTranslation
	}
	created_at: Date
	updated_at: Date
}

export interface BlogPostTranslation {
	title: string
	content: string
	alias: string
	seo: SEOData
}

export interface BlogPost {
	id: string
	category_id: string
	category_name: string
	author_id: string
	author_name: string
	author_details?: {
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
	}
	status: BlogStatus
	thumbnail_url?: string
	cover_url?: string
	view_count: number
	reading_time?: number
	comments_count: number
	pending_comments_count?: number
	translations: {
		[language: string]: BlogPostTranslation
	}
	created_at: Date
	updated_at: Date
	updated_by_id?: string
}

export interface Comment {
	id: string
	post_id: string
	user_id?: string | null
	guest_name?: string | null
	content: string
	reply_to?: string | null
	status: CommentStatus
	created_at: Date
	updated_at: Date
}

// Request/Response Types
export interface CreateCategoryRequest {
	translations: {
		[language: string]: CategoryTranslation
	}
}

export interface UpdateCategoryRequest {
	translations: {
		[language: string]: CategoryTranslation
	}
}

export interface CreateBlogPostRequest {
	category_id: string
	translations: {
		[language: string]: BlogPostTranslation
	}
	thumbnail_url?: string
	cover_url?: string
	status?: BlogStatus
}

export interface UpdateBlogPostRequest {
	category_id?: string
	status?: BlogStatus
	translations?: {
		[language: string]: BlogPostTranslation
	}
	thumbnail_url?: string
	cover_url?: string
}

export interface CreateCommentRequest {
	content: string
	guest_name: string
	reply_to?: string
}

export interface UpdateCommentRequest {
	content: string
}

export interface ModerateCommentRequest {
	status: CommentStatus
}

// Pagination Types
export interface PaginatedResponse<T> {
	items: T[]
	total: number
	page: number
	limit: number
	pages: number
}

export interface BlogListFilters {
	category_id?: string
	author_id?: string
	status?: BlogStatus
	language?: string
	page?: number
	limit?: number
	start_date?: Date
	end_date?: Date
	sort_by?: "created_at" | "view_count" | "reading_time"
	sort_direction?: "asc" | "desc"
	search?: string
	include_pending_comments?: boolean
}
