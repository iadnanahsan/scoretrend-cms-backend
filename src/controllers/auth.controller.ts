import {Request, Response} from "express"
import {PrismaClient, UserRole} from "@prisma/client"
import bcrypt from "bcrypt"
import {AuthResponse, ErrorResponse, TokenPayload, UserResponse} from "../types/auth.types"
import {RegisterUserInput, LoginUserInput, ForgotPasswordInput, ResetPasswordInput} from "../schemas/user.schema"
import {EmailService} from "../services/email.service"
import logger from "../utils/logger"
import {UserService} from "../services/user.service"
import {AuthService} from "../services/auth.service"

export class AuthController {
	private prisma: PrismaClient
	private emailService: EmailService
	private userService: UserService
	private authService: AuthService

	constructor() {
		this.prisma = new PrismaClient()
		this.emailService = new EmailService()
		this.userService = new UserService()
		this.authService = new AuthService()
	}

	public register = async (req: Request<{}, {}, RegisterUserInput>, res: Response) => {
		try {
			const {email, password, name, role = UserRole.AUTHOR} = req.body

			// Check if user exists
			const existingUser = await this.prisma.user.findUnique({
				where: {email},
			})

			if (existingUser) {
				const response: ErrorResponse = {
					status: "error",
					message: "Email already registered",
					code: "EMAIL_EXISTS",
				}
				return res.status(409).json(response)
			}

			// Hash password
			const hashedPassword = await bcrypt.hash(password, 10)

			// Create user
			const user = await this.prisma.user.create({
				data: {
					email,
					password: hashedPassword,
					name,
					role,
				},
			})

			// Generate token
			const token = this.authService.generateToken(user)

			const userResponse: UserResponse = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				status: user.status,
				email_verified: user.email_verified,
				email_verified_at: user.email_verified_at,
				verification_token: user.verification_token,
				verification_expires: user.verification_expires,
				created_at: user.created_at,
				updated_at: user.updated_at,
			}

			const response: AuthResponse = {
				message: "Registration successful",
				token,
				user: userResponse,
			}

			// Send welcome email asynchronously without waiting
			this.emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
				logger.error("Failed to send welcome email:", error)
				// Don't throw error, just log it since user is already created
			})

			// Return success response immediately
			return res.status(201).json(response)
		} catch (error) {
			logger.error("Registration error:", error)

			// Check if user was created despite error
			if (error instanceof Error && error.message.includes("email")) {
				try {
					// Try to fetch the created user
					const user = await this.prisma.user.findUnique({
						where: {email: req.body.email},
					})

					if (user) {
						// If user exists, return success with warning
						const token = this.authService.generateToken(user)
						const userResponse: UserResponse = {
							id: user.id,
							email: user.email,
							name: user.name,
							role: user.role,
							status: user.status,
							email_verified: user.email_verified,
							email_verified_at: user.email_verified_at,
							verification_token: user.verification_token,
							verification_expires: user.verification_expires,
							created_at: user.created_at,
							updated_at: user.updated_at,
						}

						const response: AuthResponse = {
							message: "Registration successful (email delivery delayed)",
							token,
							user: userResponse,
						}
						return res.status(201).json(response)
					}
				} catch (fetchError) {
					logger.error("Error fetching created user:", fetchError)
				}
			}

			const response: ErrorResponse = {
				status: "error",
				message: "Registration failed",
				code: "REGISTRATION_ERROR",
			}
			return res.status(500).json(response)
		}
	}

	public login = async (req: Request<{}, {}, LoginUserInput>, res: Response) => {
		try {
			const {email, password} = req.body

			// Validate credentials
			const user = await this.authService.validateCredentials(email, password)

			// Generate token
			const token = this.authService.generateToken(user)

			const userResponse: UserResponse = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				status: user.status,
				email_verified: user.email_verified,
				email_verified_at: user.email_verified_at,
				verification_token: user.verification_token,
				verification_expires: user.verification_expires,
				created_at: user.created_at,
				updated_at: user.updated_at,
			}

			const response: AuthResponse = {
				message: "Login successful",
				token,
				user: userResponse,
			}

			return res.status(200).json(response)
		} catch (error) {
			logger.error("Login error:", error)
			const response: ErrorResponse = {
				status: "error",
				message: error instanceof Error ? error.message : "Login failed",
				code: "LOGIN_ERROR",
			}
			return res.status(401).json(response)
		}
	}

	public forgotPassword = async (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => {
		try {
			const {email} = req.body

			// Find user
			const user = await this.prisma.user.findUnique({
				where: {email},
			})

			if (!user) {
				// Return success to prevent email enumeration
				return res.status(200).json({
					message: "If your email is registered, you will receive password reset instructions",
				})
			}

			// Generate reset token
			const resetToken = this.authService.generateToken({
				...user,
				role: user.role, // Ensure role is properly typed
			})

			// Send reset email
			await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken)

			return res.status(200).json({
				message: "If your email is registered, you will receive password reset instructions",
			})
		} catch (error) {
			logger.error("Forgot password error:", error)
			const response: ErrorResponse = {
				status: "error",
				message: "Failed to process request",
				code: "FORGOT_PASSWORD_ERROR",
			}
			return res.status(500).json(response)
		}
	}

	public resetPassword = async (req: Request<{}, {}, ResetPasswordInput>, res: Response) => {
		try {
			const {token, password} = req.body

			// Verify token
			const decoded = await this.authService.validateToken(token)

			// Hash new password
			const hashedPassword = await bcrypt.hash(password, 10)

			// Update password
			await this.prisma.user.update({
				where: {id: decoded.id},
				data: {password: hashedPassword},
			})

			return res.status(200).json({
				message: "Password has been reset successfully",
			})
		} catch (error) {
			logger.error("Reset password error:", error)
			const response: ErrorResponse = {
				status: "error",
				message: "Invalid or expired reset token",
				code: "RESET_PASSWORD_ERROR",
			}
			return res.status(400).json(response)
		}
	}

	public logout = async (req: Request, res: Response) => {
		// Since we're using JWT, we just return success
		// Client should remove the token
		return res.status(200).json({
			message: "Logged out successfully",
		})
	}

	// Verify email
	public async verifyEmail(req: Request, res: Response): Promise<void> {
		try {
			const {token} = req.body
			const user = await this.userService.verifyEmail(token)
			res.json({
				message: "Email verified successfully",
				user,
			})
		} catch (error) {
			logger.error("Error verifying email:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to verify email"})
		}
	}

	// Resend verification email
	public async resendVerification(req: Request, res: Response): Promise<void> {
		try {
			const {email} = req.body
			await this.userService.resendVerification(email)
			res.json({
				message: "If your email is registered and not verified, you will receive a verification email",
			})
		} catch (error) {
			logger.error("Error resending verification:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to resend verification email"})
		}
	}
}
