import {User, UserRole} from "@prisma/client"
import {compare} from "bcrypt"
import jwt, {SignOptions} from "jsonwebtoken"
import prisma from "../lib/prisma"
import logger from "../utils/logger"
import {TokenPayload} from "../types/auth.types"

export class AuthService {
	private readonly JWT_SECRET: string
	private readonly JWT_EXPIRES_IN: string

	constructor() {
		if (!process.env.JWT_SECRET) {
			throw new Error("JWT_SECRET is not defined in environment variables")
		}
		this.JWT_SECRET = process.env.JWT_SECRET
		this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h"
	}

	public generateToken(user: User): string {
		const payload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role,
		}

		const options: SignOptions = {
			expiresIn: this.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
		}

		return jwt.sign(payload, this.JWT_SECRET, options)
	}

	public async validateToken(token: string): Promise<TokenPayload> {
		try {
			return jwt.verify(token, this.JWT_SECRET) as TokenPayload
		} catch (error) {
			logger.error("Error validating token:", error)
			throw new Error("Invalid token")
		}
	}

	public async validateCredentials(email: string, password: string): Promise<User> {
		const user = await prisma.user.findUnique({
			where: {email},
		})

		if (!user) {
			throw new Error("Invalid credentials")
		}

		const isValid = await compare(password, user.password)
		if (!isValid) {
			throw new Error("Invalid credentials")
		}

		return user
	}

	public async validateRole(userId: string, requiredRoles: UserRole[]): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: {id: userId},
			select: {role: true},
		})

		if (!user) {
			return false
		}

		return requiredRoles.includes(user.role)
	}
}
