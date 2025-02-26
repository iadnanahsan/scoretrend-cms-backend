require("dotenv").config() // Load environment variables from a .env file
const express = require("express") // Import Express framework
const path = require("path") // Node.js utility for handling file paths
const pool = require("./config/db") // Import database connection pool
const {globalRateLimiter} = require("./middlewares/rateLimiter")
const cors = require("cors")
const timestampMiddleware = require("./middlewares/timestampMiddleware")
const {checkRequiredEnvVars} = require("./config/environment")

// Check environment variables before starting the server
try {
	checkRequiredEnvVars()
} catch (error) {
	console.error("Environment configuration error:", error.message)
	process.exit(1)
}

const app = express() // Create an instance of Express application

// Apply the middleware globally
app.use(timestampMiddleware)

// Enable CORS for all routes
app.use(cors()) // This allows requests from any origin

// Optionally configure CORS
// Uncomment below for custom configurations
// app.use(cors({
//   origin: "https://your-frontend-domain.com", // Specify allowed origin
//   methods: "GET,POST,PUT,DELETE", // Allowed HTTP methods
//   allowedHeaders: "Content-Type,Authorization" // Allowed headers
// }));

// This line is for trust proxy
app.set("trust proxy", 1)

// Import routes
const authRoutes = require("./routes/authRoutes")
const profileRoutes = require("./routes/profileRoutes")
const employeeRoutes = require("./routes/employeeRoutes")
const timekeepingRoutes = require("./routes/timekeepingRoutes")
const workTypeRoutes = require("./routes/workTypeRoutes")
const stampCodeRoutes = require("./routes/stampCodeRoutes")
const clockingRoutes = require("./routes/clockingRoutes")
const overtimeRoutes = require("./routes/overtimeRoutes")
const paidHoursRoutes = require("./routes/paidHoursRoutes")
const employeeCorrectionRequestRoutes = require("./routes/employeeCorrectionRequestRoutes")
const employerCorrectionRequestRoutes = require("./routes/employerCorrectionRequestRoutes")
const employerRoutes = require("./routes/employerRoutes")
const adminRoutes = require("./routes/adminRoutes")
const apiTokenRoutes = require("./routes/apiTokenRoutes")

// Swagger Documentation for API
const {swaggerDocs, swaggerUi} = require("./config/swaggerConfig")

// Import background jobs
const {scheduleAutoClockOut} = require("./jobs/autoClockOut")
const {scheduleReconciliation} = require("./jobs/reconcilePaidHours")

// Only initialize background jobs if not in test environment
if (process.env.NODE_ENV !== "test") {
	scheduleAutoClockOut()
	console.log("Auto clock-out background job initialized")
	scheduleReconciliation()
}

// Handle graceful shutdown for the entire application
const gracefulShutdown = async (signal) => {
	console.log(`\n${signal} signal received. Starting graceful shutdown...`)
	let exitCode = 0

	try {
		// First, stop accepting new requests
		console.log("Closing HTTP server...")
		await new Promise((resolve) => {
			server.close(resolve)
		})
		console.log("HTTP server closed")

		// Stop background jobs
		if (autoClockOutJob) {
			console.log("Stopping auto clock-out job...")
			autoClockOutJob.cancel()
			console.log("Auto clock-out job stopped")
		}

		// Close database pool
		console.log("Closing database connections...")
		await pool.end()
		console.log("Database connections closed")

		// Close Redis if connected
		if (redisClient && redisClient.isOpen) {
			console.log("Closing Redis connection...")
			await redisClient.quit()
			console.log("Redis connection closed")
		}

		console.log("Graceful shutdown completed")
	} catch (error) {
		console.error("Error during graceful shutdown:", error)
		exitCode = 1
	} finally {
		// Add a small delay to ensure all logs are printed
		setTimeout(() => {
			process.exit(exitCode)
		}, 100)
	}
}

// Only start the server if this file is run directly (not required/imported)
if (process.env.NODE_ENV !== "test") {
	const PORT = process.env.PORT || 3001
	const server = app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`)
		console.log(`Auto clock-out background job running every minute`)
	})

	// Register shutdown handlers
	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
	process.on("SIGINT", () => gracefulShutdown("SIGINT"))

	// Enhance error handlers
	process.on("uncaughtException", async (error) => {
		console.error("Uncaught Exception:", error)
		await gracefulShutdown("UNCAUGHT_EXCEPTION")
	})

	process.on("unhandledRejection", async (reason, promise) => {
		console.error("Unhandled Rejection at:", promise, "reason:", reason)
		await gracefulShutdown("UNHANDLED_REJECTION")
	})
}

// Export the app for testing
module.exports = app

// Middleware for parsing JSON data
// Ensures incoming requests with JSON payloads are parsed
app.use(
	express.json({
		strict: true, // Enforce strict JSON parsing
	})
)

// Middleware for handling invalid JSON errors
// Captures SyntaxErrors caused by malformed JSON and returns a friendly error response
app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
		console.error("Invalid JSON format:", err.message)
		return res.status(400).json({
			message: "Invalid JSON format. Ensure all keys and values are properly quoted.",
		})
	}
	next() // Pass other errors to the global error handler
})

// Middleware for request logging
// Logs method, URL, and headers for debugging incoming requests
app.use((req, res, next) => {
	console.log("Incoming Request:", {
		method: req.method,
		url: req.url,
		headers: req.headers,
	})
	next()
})

// Serve static files from "uploads" directory
// Provides access to uploaded files through the /uploads route
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Swagger Documentation
// Serves API documentation at the /api-docs endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs))
console.log("Swagger Docs available at http://localhost:3000/api-docs")

// Apply rate limiter to all routes
app.use(globalRateLimiter)

// Route Definitions
// Organized grouping of application routes
app.use("/api/auth", authRoutes) // Authentication routes
app.use("/api/profile", profileRoutes) // Profile routes
app.use("/api/employees", employeeRoutes) // Employee management routes
app.use("/api/timekeeping", timekeepingRoutes) // Timekeeping routes
app.use("/api/work-types", workTypeRoutes) // Work Types routes
app.use("/api/stamp-codes", stampCodeRoutes) // Stamp Codes routes
app.use("/api/clocking", clockingRoutes) // Legacy clocking routes
// app.use("/api/clocking/v2", clockingRoutesV2) // New clocking routes with enhanced features
app.use("/api/overtime", overtimeRoutes) // Overtime routes
app.use("/api/paid-hours", paidHoursRoutes) // Paid Hours routes
app.use("/api/corrections", employeeCorrectionRequestRoutes) // Correction requests (employee-side)
app.use("/api/employer/correction-requests", employerCorrectionRequestRoutes) // Correction requests (employer-side)
app.use("/api/employer", employerRoutes) // Employer dashboard and management routes
app.use("/api/admin", adminRoutes) // Admin dashboard and management routes
app.use("/api/tokens", apiTokenRoutes)

app.use(
	express.json({
		strict: true,
	})
)

// Protected Routes Example
// Demonstrates usage of middleware for protected routes
app.use("/api/protected", (req, res) => {
	res.json({message: "Access granted to protected routes"})
})

// Health Check Endpoint
// Simple GET route to verify database connection and API health
app.get("/", async (req, res) => {
	try {
		const result = await pool.query("SELECT NOW()")
		res.json({message: "Connected to DB", time: result.rows[0].now})
	} catch (error) {
		console.error("Database connection failed:", error.message)
		res.status(500).json({error: "Database connection failed"})
	}
})

// Global Error Handling Middleware
// Catches any unhandled errors and sends a generic error response
app.use((err, req, res, next) => {
	console.error("Error Middleware:", err.message)
	res.status(err.status || 500).json({error: err.message || "Server Error"})
})
