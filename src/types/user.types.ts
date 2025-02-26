import {UserRole, UserStatus} from "@prisma/client"

export interface CreateUserData {
	email: string
	password: string
	name: string
	role: UserRole
}

export interface UpdateUserData {
	email?: string
	name?: string
	role?: UserRole
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

export interface PaginatedUsersResponse {
	users: UserResponse[]
	pagination: {
		total: number
		page: number
		limit: number
		pages: number
	}
}
