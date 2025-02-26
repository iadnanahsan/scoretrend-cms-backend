import {z} from "zod"
import {UserRole} from "@prisma/client"

export const registerUserSchema = z.object({
	body: z.object({
		name: z
			.string()
			.min(2, "Name must be at least 2 characters")
			.max(100, "Name cannot exceed 100 characters")
			.trim(),
		email: z.string().email("Invalid email format").trim().toLowerCase(),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
				"Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
			),
		role: z.nativeEnum(UserRole).optional(),
	}),
})

export const loginUserSchema = z.object({
	body: z.object({
		email: z.string().email("Invalid email format").trim().toLowerCase(),
		password: z.string().min(1, "Password is required"),
	}),
})

export const forgotPasswordSchema = z.object({
	body: z.object({
		email: z.string().email("Invalid email format").trim().toLowerCase(),
	}),
})

export const resetPasswordSchema = z.object({
	body: z.object({
		token: z.string().min(1, "Reset token is required").trim(),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
				"Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
			),
	}),
})

export const verifyEmailSchema = z.object({
	body: z.object({
		token: z.string().min(1, "Verification token is required").trim(),
	}),
})

export const resendVerificationSchema = z.object({
	body: z.object({
		email: z.string().email("Invalid email format").trim().toLowerCase(),
	}),
})

// Export types for use in other files
export type RegisterUserInput = z.infer<typeof registerUserSchema>["body"]
export type LoginUserInput = z.infer<typeof loginUserSchema>["body"]
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"]
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"]
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>["body"]
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>["body"]
