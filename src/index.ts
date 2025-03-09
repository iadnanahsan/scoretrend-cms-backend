import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import swaggerUi from "swagger-ui-express"
import swaggerJsdoc from "swagger-jsdoc"
import net from "net"
import cookieParser from "cookie-parser"
import CONFIG from "./config"
import logger from "./utils/logger"
import {initializeDatabase} from "./utils/db"
import {EmailService} from "./services/email.service"
import {detectLanguage} from "./middleware/language.middleware"
import {injectMetaTags} from "./middleware/meta.middleware"
import {handleRedirects} from "./middleware/url.middleware"
import {URLService} from "./services/url.service"
import authRoutes from "./routes/auth.routes"
import userRoutes from "./routes/user.routes"
import pageRoutes from "./routes/page.routes"
import sectionRoutes from "./routes/section.routes"
import mediaRoutes from "./routes/media.routes"
import blogRoutes from "./routes/blog.routes"
import authorRoutes from "./routes/author.routes"
import faqRoutes from "./routes/faq.routes"
import sitemapRoutes from "./routes/sitemap.routes"
import path from "path"
import {createSwaggerMiddleware} from "./swagger/middleware"
import {requestLogger} from "./middleware/request-logger.middleware"

// Initialize Express app
const app = express()

// Configure trust proxy settings
app.set("trust proxy", 1) // Trust first proxy

// Initialize services
const emailService = new EmailService()
const urlService = URLService.getInstance()

// Add common redirect rules
urlService.addRedirect({
	source: "/about-us",
	destination: "/about",
	type: 301,
})

// Add regex redirects for old blog URLs
urlService.addRedirect({
	source: "^/posts/([0-9]+)/([^/]+)$",
	destination: "/blog/$2",
	type: 301,
	isRegex: true,
})

// Check if port is in use
const isPortInUse = (port: number): Promise<boolean> => {
	return new Promise((resolve) => {
		const server = net.createServer()
		server.once("error", () => {
			resolve(true)
		})
		server.once("listening", () => {
			server.close()
			resolve(false)
		})
		server.listen(port)
	})
}

// Swagger configuration
const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "ScoreTrend CMS API Documentation",
			version: "1.0.0",
			description: "API documentation for ScoreTrend CMS Backend",
		},
		servers: [
			{
				url: "https://scoretrend-cms-api.stabilityy.com/api/v1",
				description: "Primary API server",
			},
		],
	},
	apis: ["./src/routes/*.ts", "./src/swagger/docs/*.yaml"],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

// Basic middleware
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(requestLogger)

// Security middleware with specific CSP for Swagger UI
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
				styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
				imgSrc: ["'self'", "data:", "https:", "http:"],
				connectSrc: ["'self'", "*"],
				fontSrc: ["'self'", "https:", "http:"],
				objectSrc: ["'none'"],
				mediaSrc: ["'none'"],
				frameSrc: ["'none'"],
			},
		},
		crossOriginEmbedderPolicy: false,
		crossOriginResourcePolicy: {policy: "cross-origin"},
	})
)

// CORS configuration with Swagger UI support
app.use(
	cors({
		origin: "*", // Allow all origins
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
		allowedHeaders: ["*"], // Allow all headers
		exposedHeaders: ["*"], // Expose all headers
		maxAge: 86400, // Cache preflight requests for 24 hours
	})
)

// Static files for Swagger UI
app.use(express.static(path.join(__dirname, "public")))

app.use(compression())

// Request logging
app.use(
	morgan(
		function (tokens, req, res) {
			return [
				"API REQUEST:",
				tokens.method(req, res),
				tokens.url(req, res),
				tokens.status(req, res),
				tokens["response-time"](req, res),
				"ms",
				"- IP:",
				req.ip,
				"- User-Agent:",
				req.headers["user-agent"],
			].join(" ")
		},
		{
			stream: {
				write: (message) => logger.debug(message.trim()),
			},
		}
	)
)

// Rate limiting
app.use(
	rateLimit({
		windowMs: CONFIG.RATE_LIMIT.WINDOW_MS,
		max: CONFIG.RATE_LIMIT.MAX_REQUESTS,
		skip: (req) => {
			// Skip rate limiting for authenticated requests
			return !!req.headers.authorization
		},
		message: {
			error: "Too many requests, please try again later.",
			message: "Too many requests, please try again later.",
		},
		standardHeaders: true,
		legacyHeaders: false,
	})
)

// URL and language handling (order is important)
app.use(handleRedirects())
app.use(
	detectLanguage({
		urlPrefix: true, // Enable language prefixes in URLs
		queryParam: "lang", // Allow language override via query parameter
	})
)

// Meta tag middleware (after language detection, before routes)
app.use(
	injectMetaTags({
		baseUrl: `http://localhost:${CONFIG.PORT}`,
		defaultType: "website",
	})
)

// Mount sitemap and robots.txt routes at root level (BEFORE API routes and Swagger)
app.use(sitemapRoutes)

// Swagger Documentation (using our custom middleware)
app.use("/api-docs", createSwaggerMiddleware())

// API Routes
const apiRouter = express.Router()
apiRouter.use("/auth", authRoutes)
apiRouter.use("/users", userRoutes)
apiRouter.use("/cms/pages", pageRoutes)
apiRouter.use("/cms/pages", sectionRoutes)
apiRouter.use("/cms/media", mediaRoutes)
apiRouter.use("/cms/blog", blogRoutes)
apiRouter.use("/cms/authors", authorRoutes)
apiRouter.use("/cms/faqs", faqRoutes)

// Mount API routes under /api/v1
app.use(`/api/${CONFIG.API_VERSION}`, apiRouter)

// Base API route
apiRouter.get("/", (req, res) => {
	res.json({
		message: "ScoreTrend CMS API",
		version: CONFIG.API_VERSION,
		documention: "/api-docs",
	})
})

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
	logger.error(err.stack)
	res.status(500).json({
		error: "Internal Server Error",
		message: CONFIG.NODE_ENV === "development" ? err.message : undefined,
	})
})

// Initialize database and start server
async function startServer() {
	let server: any = null

	try {
		// Initialize database
		await initializeDatabase()

		// Verify email service connection
		let emailStatus = false
		try {
			await emailService.verifyConnection()
			emailStatus = true
		} catch (error) {
			logger.warn("Email service connection failed - emails will not be sent")
		}

		// Start the server
		server = app.listen(CONFIG.PORT, () => {
			logger.info(`Server running in ${CONFIG.NODE_ENV} mode on port ${CONFIG.PORT}`)
			logger.info("Email service status:", emailStatus ? "connected" : "disconnected")
			logger.info("API Documentation available at: /api-docs")

			// Test log message to verify console output
			console.log(`\n\n=== API SERVER STARTED ON PORT ${CONFIG.PORT} ===`)
			console.log(`=== LOG_LEVEL: ${process.env.LOG_LEVEL || "debug"} ===`)
			console.log(`=== ENVIRONMENT: ${CONFIG.NODE_ENV} ===\n\n`)
		})

		// Graceful shutdown
		const gracefulShutdown = (signal: string) => {
			logger.info(`${signal} received. Starting graceful shutdown...`)
			server.close(() => {
				logger.info("Server closed")
				process.exit(0)
			})

			// Force shutdown after 30 seconds
			setTimeout(() => {
				logger.error("Could not close connections in time, forcefully shutting down")
				process.exit(1)
			}, 30000)
		}

		// Handle shutdown signals
		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
		process.on("SIGINT", () => gracefulShutdown("SIGINT"))

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (err: Error) => {
			logger.error("Unhandled Promise Rejection:", err)

			// Check if this is an email service error
			const errorMessage = err?.message || ""
			if (
				errorMessage.includes("Email service") ||
				errorMessage.includes("SMTP") ||
				errorMessage.includes("nodemailer") ||
				(errorMessage.includes("ETIMEDOUT") && errorMessage.includes("465"))
			) {
				// Log critical error but don't shut down for email issues
				logger.error(
					"CRITICAL: Email service error detected in unhandled rejection. Service may be unavailable but application will continue running."
				)

				// Don't call gracefulShutdown for email-related errors
				return
			}

			// For other unhandled rejections, proceed with graceful shutdown
			gracefulShutdown("UNHANDLED_REJECTION")
		})
	} catch (error) {
		logger.error("Failed to start server:", error)
		process.exit(1)
	}
}

startServer()

export default app
