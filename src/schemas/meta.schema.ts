import {z} from "zod"
import {SUPPORTED_LANGUAGES} from "../config/languages"

// Basic meta tag schema
const metaTagSchema = z.object({
	title: z.string().min(1, "Title is required").max(60, "Title cannot exceed 60 characters"),
	description: z.string().min(1, "Description is required").max(160, "Description cannot exceed 160 characters"),
	author: z.string().optional(),
	canonical_url: z.string().url("Invalid canonical URL").optional(),
})

// Open Graph schema
const openGraphSchema = z.object({
	title: z.string().min(1, "OpenGraph title is required").max(60, "OpenGraph title cannot exceed 60 characters"),
	description: z
		.string()
		.min(1, "OpenGraph description is required")
		.max(160, "OpenGraph description cannot exceed 160 characters"),
	image: z.string().url("Invalid OpenGraph image URL").optional(),
	type: z.enum(["website", "article"], {
		required_error: "OpenGraph type is required",
		invalid_type_error: "OpenGraph type must be either 'website' or 'article'",
	}),
})

// Twitter Card schema
const twitterCardSchema = z.object({
	card: z.enum(["summary", "summary_large_image"], {
		required_error: "Twitter card type is required",
		invalid_type_error: "Twitter card must be either 'summary' or 'summary_large_image'",
	}),
	title: z.string().min(1, "Twitter title is required").max(60, "Twitter title cannot exceed 60 characters"),
	description: z
		.string()
		.min(1, "Twitter description is required")
		.max(160, "Twitter description cannot exceed 160 characters"),
	image: z.string().url("Invalid Twitter image URL").optional(),
})

// Complete SEO meta data schema
export const seoMetaDataSchema = z.object({
	basics: metaTagSchema,
	openGraph: openGraphSchema,
	twitter: twitterCardSchema,
})

// Schema for meta data with translations
export const translatedMetaDataSchema = z.object({
	translations: z.record(
		z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
			message: "Invalid language code",
		}),
		seoMetaDataSchema
	),
})

// Export types
export type MetaTagContent = z.infer<typeof metaTagSchema>
export type OpenGraphContent = z.infer<typeof openGraphSchema>
export type TwitterCardContent = z.infer<typeof twitterCardSchema>
export type SEOMetaData = z.infer<typeof seoMetaDataSchema>
export type TranslatedMetaData = z.infer<typeof translatedMetaDataSchema>
