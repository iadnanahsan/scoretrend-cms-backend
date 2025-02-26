import {User, UserRole} from "@prisma/client"
import {Request} from "express"

export interface TokenPayload {
	id: string
	email: string
	role: UserRole
}

export interface AuthenticatedRequest extends Request {
	user?: TokenPayload
}

export type UserResponse = Omit<User, "password">

export interface AuthResponse {
	message: string
	token: string
	user: UserResponse
}

export interface ErrorResponse {
	status: "error"
	message: string
	code?: string
	details?: unknown
}

export interface EmailVerificationToken {
	token: string
	userId: string
	expiresAt: Date
}

export interface VerifyEmailRequest {
	token: string
}

export interface ResendVerificationRequest {
	email: string
}

export interface JWTPayload {
	id: string
	email: string
	role: UserRole
	iat?: number
	exp?: number
}
