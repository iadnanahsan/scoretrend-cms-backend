import {z} from "zod"
import {SUPPORTED_LANGUAGES} from "../config/languages"
import {BlogStatus, CommentStatus} from "@prisma/client"
import {SEOData} from "../types/page.types"
import {seoMetaDataSchema} from "./meta.schema"

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
	seo: z.preprocess((val) => {
		// If it's already in the correct format, return it as is
		if (val && typeof val === "object" && "basics" in val && "openGraph" in val && "twitter" in val) {
			return val
		}

		// Otherwise, transform the flattened structure to the expected format
		if (val && typeof val === "object") {
			const flatObj = val as Record<string, any>
			return {
				basics: {
					title: flatObj.title || "",
					description: flatObj.description || "",
					author: flatObj.author,
					canonical_url: flatObj.canonical_url,
				},
				openGraph: {
					title: flatObj.og_title || flatObj.title || "",
					description: flatObj.og_description || flatObj.description || "",
					image: flatObj.og_image,
					type: flatObj.og_type || "article",
				},
				twitter: {
					card: flatObj.twitter_card || "summary_large_image",
					title: flatObj.twitter_title || flatObj.og_title || flatObj.title || "",
					description: flatObj.twitter_description || flatObj.og_description || flatObj.description || "",
					image: flatObj.twitter_image || flatObj.og_image,
				},
			}
		}
		return val
	}, seoMetaDataSchema),
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
		status: z.nativeEnum(BlogStatus).optional(),
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
