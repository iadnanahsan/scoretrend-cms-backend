import {User, UserRole, UserStatus} from "@prisma/client"
import {Request} from "express"

export interface TokenPayload {
	id: string
	email: string
	role: UserRole
}

export interface AuthenticatedRequest extends Request {
	user?: TokenPayload
}

export interface UserResponse {
	id: string
	email: string
	name: string
	role: UserRole
	status: UserStatus
	created_at: Date
	updated_at: Date
}

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

export interface JWTPayload {
	id: string
	email: string
	role: UserRole
	iat?: number
	exp?: number
}
