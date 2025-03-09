import {User, UserRole, UserStatus, Prisma} from "@prisma/client"
import {EmailService} from "./email.service"
import prisma from "../lib/prisma"
import {AuthService} from "./auth.service"
import acceptLanguage from "accept-language"
import {LanguageService} from "./language.service"
import logger from "../utils/logger"
import crypto from "crypto"
import bcrypt from "bcrypt"

export class UserService {
	private emailService: EmailService
	private authService: AuthService

	constructor() {
		this.emailService = new EmailService()
		this.authService = new AuthService()
	}

	// User Management Methods
	async findUserById(id: string): Promise<User | null> {
		return await prisma.user.findUnique({
			where: {id},
		})
	}

	async findUserByEmail(email: string): Promise<User | null> {
		return await prisma.user.findUnique({
			where: {email},
		})
	}

	async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
		return await prisma.user.update({
			where: {id},
			data,
		})
	}

	async deleteUser(id: string): Promise<User> {
		return await prisma.user.delete({
			where: {id},
		})
	}

	async listUsers(params: {
		skip?: number
		take?: number
		where?: Prisma.UserWhereInput
		orderBy?: Prisma.UserOrderByWithRelationInput
		search?: string
	}): Promise<{users: User[]; total: number}> {
		try {
			let whereCondition: Prisma.UserWhereInput = params.where || {}

			// Add search functionality
			if (params.search) {
				whereCondition = {
					...whereCondition,
					OR: [
						{name: {contains: params.search, mode: "insensitive"}},
						{email: {contains: params.search, mode: "insensitive"}},
					],
				}
			}

			const [users, total] = await Promise.all([
				prisma.user.findMany({
					skip: params.skip,
					take: params.take,
					where: whereCondition,
					orderBy: params.orderBy || {created_at: "desc"},
				}),
				prisma.user.count({where: whereCondition}),
			])

			return {users, total}
		} catch (error) {
			logger.error("Error listing users:", error)
			throw error
		}
	}

	// User Registration Method
	async createUser(data: {email: string; password: string; name: string; role?: UserRole}): Promise<User> {
		// Create user with active status
		const user = await prisma.user.create({
			data: {
				email: data.email,
				password: data.password, // Password should already be hashed by the controller
				name: data.name,
				role: data.role || UserRole.AUTHOR,
				status: UserStatus.ACTIVE,
			} satisfies Prisma.UserCreateInput,
		})

		// Send welcome email
		await this.emailService.sendWelcomeEmail(user.email, user.name)

		return user
	}
}
