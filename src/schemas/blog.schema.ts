import {z} from "zod"
import {SUPPORTED_LANGUAGES} from "../config/languages"
import {BlogStatus, CommentStatus} from "@prisma/client"
import {SEOData} from "../types/page.types"

// Category Schemas
const categoryTranslationSchema = z.object({
	name: z.string().min(1, "Name is required").max(255, "Name cannot exceed 255 characters"),
	description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
})

export const createCategorySchema = z.object({
	body: z.object({
		translations: z.record(
			z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
				message: "Invalid language code",
			}),
			categoryTranslationSchema
		),
	}),
})

export const updateCategorySchema = z.object({
	body: z.object({
		translations: z.record(
			z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
				message: "Invalid language code",
			}),
			categoryTranslationSchema
		),
	}),
})

// Post Schemas
const postTranslationSchema = z.object({
	title: z.string().min(1, "Title is required").max(255, "Title cannot exceed 255 characters"),
	content: z.string().min(1, "Content is required"),
	alias: z.string().min(1, "Alias is required").max(255, "Alias cannot exceed 255 characters"),
	seo: z.custom<SEOData>((data) => data, "Invalid SEO data"),
})

export const createPostSchema = z.object({
	body: z.object({
		category_id: z.string().uuid("Invalid category ID"),
		translations: z.record(
			z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
				message: "Invalid language code",
			}),
			postTranslationSchema
		),
		thumbnail_url: z.string().url("Invalid thumbnail URL").optional(),
		cover_url: z.string().url("Invalid cover URL").optional(),
	}),
})

export const updatePostSchema = z.object({
	body: z.object({
		category_id: z.string().uuid("Invalid category ID").optional(),
		status: z.nativeEnum(BlogStatus).optional(),
		translations: z
			.record(
				z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
					message: "Invalid language code",
				}),
				postTranslationSchema
			)
			.optional(),
		thumbnail_url: z.string().url("Invalid thumbnail URL").optional(),
		cover_url: z.string().url("Invalid cover URL").optional(),
	}),
})

// Comment Schemas
export const createCommentSchema = z.object({
	body: z.object({
		content: z.string().min(1, "Content is required").max(1000, "Content cannot exceed 1000 characters"),
		guest_name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
		reply_to: z.string().uuid("Invalid reply comment ID").optional(),
	}),
})

export const updateCommentSchema = z.object({
	body: z.object({
		content: z.string().min(1, "Content is required").max(1000, "Content cannot exceed 1000 characters"),
	}),
})

export const moderateCommentSchema = z.object({
	body: z.object({
		status: z.nativeEnum(CommentStatus),
	}),
})

// Export types for use in other files
export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"]
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"]
export type CreateBlogPostRequest = z.infer<typeof createPostSchema>["body"]
export type UpdateBlogPostRequest = z.infer<typeof updatePostSchema>["body"]
export type CreateCommentRequest = z.infer<typeof createCommentSchema>["body"]
export type UpdateCommentRequest = z.infer<typeof updateCommentSchema>["body"]
export type ModerateCommentRequest = z.infer<typeof moderateCommentSchema>["body"]
