import nodemailer from "nodemailer"
import logger from "../utils/logger"
import {promisify} from "util"
import SMTPTransport from "nodemailer/lib/smtp-transport"

interface EmailOptions {
	to: string
	subject: string
	html: string
}

interface RetryConfig {
	attempts: number
	delay: number
	backoff: number
}

export class EmailService {
	private transporter!: nodemailer.Transporter
	private retryConfig: RetryConfig = {
		attempts: 3,
		delay: 1000,
		backoff: 2,
	}
	private isInitialized: boolean = false
	private transporterOptions: SMTPTransport.Options

	constructor() {
		const port = Number(process.env.SMTP_PORT)
		// Automatically determine secure based on port
		const secure = port === 465

		// Store configuration separately for reuse
		this.transporterOptions = {
			host: process.env.SMTP_HOST,
			port,
			secure, // Use SSL/TLS for port 465
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
			tls: {
				// TLS Configuration
				rejectUnauthorized: false, // Accept self-signed certificates
				minVersion: "TLSv1.2", // Use modern TLS
			},
			debug: true,
			logger: true,
			// Increase timeouts for better reliability
			connectionTimeout: 30000,
			greetingTimeout: 30000,
			socketTimeout: 60000,
		}

		logger.info("Initializing email service with configuration:", {
			host: this.transporterOptions.host,
			port: this.transporterOptions.port,
			secure: this.transporterOptions.secure,
			tlsMinVersion: this.transporterOptions.tls?.minVersion,
		})

		this.initializeTransporter()
	}

	private async initializeTransporter() {
		try {
			// Close existing transporter if it exists
			if (this.transporter) {
				await this.closeTransporter()
			}

			// Create new transporter with current options
			this.transporter = nodemailer.createTransport(this.transporterOptions)

			// Test connection with extended timeout and proper error handling
			const verifyPromise = this.transporter.verify()
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Connection verification timed out")), 30000)
			)

			await Promise.race([verifyPromise, timeoutPromise])

			this.isInitialized = true
			logger.info("Email service initialized successfully", {
				host: this.transporterOptions.host,
				port: this.transporterOptions.port,
				secure: this.transporterOptions.secure,
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			logger.error("Failed to initialize email service:", {
				error: errorMessage,
				host: this.transporterOptions.host,
				port: this.transporterOptions.port,
				secure: this.transporterOptions.secure,
				stack: error instanceof Error ? error.stack : undefined,
			})
			this.isInitialized = false
			await this.closeTransporter()

			// Throw error to be handled by retry mechanism
			throw new Error(`Email service initialization failed: ${errorMessage}`)
		}
	}

	private async closeTransporter() {
		if (this.transporter && typeof this.transporter.close === "function") {
			try {
				await this.transporter.close()
				logger.info("Email transporter closed successfully")
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error"
				logger.error("Error closing email transporter:", {
					error: errorMessage,
					stack: error instanceof Error ? error.stack : undefined,
				})
			}
		}
	}

	private async sleep(ms: number): Promise<void> {
		await promisify(setTimeout)(ms)
	}

	private async retryOperation<T>(operation: () => Promise<T>, errorMessage: string): Promise<T> {
		let lastError: Error | null = null
		let delay = this.retryConfig.delay

		for (let attempt = 1; attempt <= this.retryConfig.attempts; attempt++) {
			try {
				// Always verify connection before sending
				if (!this.isInitialized || !(await this.verifyConnection())) {
					logger.info("Reinitializing email service before attempt", {attempt})
					await this.initializeTransporter()
				}

				// Attempt the operation
				return await operation()
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))
				logger.warn(`${errorMessage} (Attempt ${attempt}/${this.retryConfig.attempts}):`, {
					error: lastError,
					attempt,
					connectionStatus: this.isInitialized,
				})

				// If this is not the last attempt, wait before retrying
				if (attempt < this.retryConfig.attempts) {
					await this.sleep(delay)
					delay *= this.retryConfig.backoff
				}

				// Force reinitialization on next attempt
				this.isInitialized = false
				await this.closeTransporter()
			}
		}

		throw new Error(`${errorMessage} after ${this.retryConfig.attempts} attempts: ${lastError?.message}`)
	}

	public async verifyConnection(): Promise<boolean> {
		try {
			await this.transporter.verify()
			return true
		} catch (error) {
			logger.error("Email service connection failed:", error)
			return false
		}
	}

	public async sendEmail({to, subject, html}: EmailOptions): Promise<void> {
		await this.retryOperation(async () => {
			const info = await this.transporter.sendMail({
				from: process.env.SMTP_FROM,
				to,
				subject,
				html,
			})
			logger.info("Email sent successfully", {
				messageId: info.messageId,
				response: info.response,
				to,
				subject,
			})
		}, "Failed to send email")
	}

	public async sendWelcomeEmail(email: string, name: string): Promise<void> {
		await this.retryOperation(async () => {
			const info = await this.transporter.sendMail({
				from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
				to: email,
				subject: "Welcome to ScoreTrend CMS",
				html: `
						<h1>Welcome to ScoreTrend CMS</h1>
						<p>Hello ${name},</p>
						<p>Thank you for joining ScoreTrend CMS. Your account has been created successfully.</p>
						<p>Best regards,<br>The ScoreTrend Team</p>
					`,
			})
			logger.info("Welcome email sent successfully", {
				messageId: info.messageId,
				response: info.response,
				to: email,
			})
		}, "Failed to send welcome email")
	}

	public async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
		await this.retryOperation(async () => {
			const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
			const info = await this.transporter.sendMail({
				from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
				to: email,
				subject: "Reset Your Password - ScoreTrend CMS",
				html: `
						<h1>Password Reset Request</h1>
						<p>Hello ${name},</p>
						<p>We received a request to reset your password. Click the link below to set a new password:</p>
						<p><a href="${resetLink}">Reset Password</a></p>
						<p>This link will expire in 1 hour.</p>
						<p>If you didn't request this, please ignore this email.</p>
						<p>Best regards,<br>The ScoreTrend Team</p>
					`,
			})
			logger.info("Password reset email sent successfully", {
				messageId: info.messageId,
				response: info.response,
				to: email,
			})
		}, "Failed to send password reset email")
	}
}
