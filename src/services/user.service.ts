import {User, UserRole, UserStatus, Prisma} from "@prisma/client"
import prisma from "../lib/prisma"
import {EmailService} from "./email.service"
import {AuthService} from "./auth.service"
import logger from "../utils/logger"
import {randomBytes} from "crypto"

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

	// User Registration and Verification Methods
	async createUser(data: {email: string; password: string; name: string; role?: UserRole}): Promise<User> {
		const verificationToken = randomBytes(32).toString("hex")
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		const user = await prisma.user.create({
			data: {
				email: data.email,
				password: data.password,
				name: data.name,
				role: data.role || UserRole.AUTHOR,
				status: UserStatus.INACTIVE,
				email_verified: false,
				verification_token: verificationToken,
				verification_expires: verificationExpires,
			} satisfies Prisma.UserCreateInput,
		})

		// Send verification email
		await this.emailService.sendEmail({
			to: user.email,
			subject: "Verify your email",
			html: `Hello ${user.name},<br><br>Please verify your email by clicking this link: <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>`,
		})

		return user
	}

	async verifyEmail(token: string): Promise<User> {
		const user = await prisma.user.findFirst({
			where: {
				verification_token: token,
				verification_expires: {
					gt: new Date(),
				},
			} satisfies Prisma.UserWhereInput,
		})

		if (!user) {
			throw new Error("Invalid or expired verification token")
		}

		if (user.email_verified) {
			throw new Error("Email already verified")
		}

		return await prisma.user.update({
			where: {id: user.id},
			data: {
				status: UserStatus.ACTIVE,
				email_verified: true,
				email_verified_at: new Date(),
				verification_token: null,
				verification_expires: null,
			} satisfies Prisma.UserUpdateInput,
		})
	}

	async resendVerification(email: string): Promise<void> {
		const user = await prisma.user.findUnique({
			where: {email},
		})

		if (!user) {
			// Silent fail to prevent email enumeration
			return
		}

		if (user.email_verified) {
			throw new Error("Email already verified")
		}

		// Generate new verification token
		const verificationToken = randomBytes(32).toString("hex")
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		// Update user with new verification token
		await prisma.user.update({
			where: {id: user.id},
			data: {
				verification_token: verificationToken,
				verification_expires: verificationExpires,
			} satisfies Prisma.UserUpdateInput,
		})

		// Send verification email
		await this.emailService.sendEmail({
			to: user.email,
			subject: "Verify your email",
			html: `Hello ${user.name},<br><br>Please verify your email by clicking this link: <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>`,
		})
	}
}
