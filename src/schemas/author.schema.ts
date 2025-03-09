import {z} from "zod"
import {SUPPORTED_LANGUAGES} from "../config/languages"

// Author translation schema
const authorTranslationSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
	description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
})

// Create author detail schema
export const createAuthorDetailSchema = z.object({
	body: z.object({
		user_id: z.string().uuid("Invalid user ID format"),
		profile_image_url: z.string().url("Invalid profile image URL").optional(),
		translations: z.record(
			z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
				message: "Invalid language code",
			}),
			authorTranslationSchema
		),
	}),
})

// Update author detail schema
export const updateAuthorDetailSchema = z.object({
	body: z.object({
		profile_image_url: z.string().url("Invalid profile image URL").optional(),
		name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters").optional(),
		description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
		// Keep translations for backward compatibility, but it's not used in the new implementation
		translations: z
			.record(
				z.string().refine((val) => Object.keys(SUPPORTED_LANGUAGES).includes(val), {
					message: "Invalid language code",
				}),
				authorTranslationSchema
			)
			.optional(),
	}),
})

// Update author translation schema for a specific language
export const updateAuthorTranslationSchema = z.object({
	body: authorTranslationSchema,
})

// Export types for use in other files
export type CreateAuthorDetailInput = z.infer<typeof createAuthorDetailSchema>["body"]
export type UpdateAuthorDetailInput = z.infer<typeof updateAuthorDetailSchema>["body"]
export type UpdateAuthorTranslationInput = z.infer<typeof updateAuthorTranslationSchema>["body"]
