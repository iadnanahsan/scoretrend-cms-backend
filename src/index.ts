import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import swaggerUi from "swagger-ui-express"
import swaggerJsdoc from "swagger-jsdoc"
import net from "net"
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

// Find next available port
const findAvailablePort = async (startPort: number, maxAttempts: number = 10): Promise<number> => {
	for (let i = 0; i < maxAttempts; i++) {
		const port = startPort + i
		const inUse = await isPortInUse(port)
		if (!inUse) return port
	}
	throw new Error(`No available ports found after ${maxAttempts} attempts`)
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
	morgan("combined", {
		stream: {
			write: (message) => logger.info(message.trim()),
		},
	})
)

// Rate limiting
app.use(
	rateLimit({
		windowMs: CONFIG.RATE_LIMIT.WINDOW_MS,
		max: CONFIG.RATE_LIMIT.MAX_REQUESTS,
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

		// Find available port
		const port = await findAvailablePort(CONFIG.PORT)
		if (port !== CONFIG.PORT) {
			logger.warn(`Port ${CONFIG.PORT} was in use, using port ${port} instead`)
		}

		// Start the server
		server = app.listen(port, () => {
			logger.info(`Server running in ${CONFIG.NODE_ENV} mode on port ${port}`)
			logger.info("Email service status:", emailStatus ? "connected" : "disconnected")
			logger.info("API Documentation available at: /api-docs")
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
			gracefulShutdown("UNHANDLED_REJECTION")
		})
	} catch (error) {
		logger.error("Failed to start server:", error)
		process.exit(1)
	}
}

startServer()

export default app
