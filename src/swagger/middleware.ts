import express from "express"
import swaggerUi from "swagger-ui-express"
import {SwaggerLoader} from "./loader"
import {swaggerOptions} from "./config"
import logger from "../utils/logger"

export const createSwaggerMiddleware = () => {
	const router = express.Router()
	const swaggerLoader = SwaggerLoader.getInstance()

	try {
		logger.info("Initializing Swagger middleware...")
		const swaggerDocument = swaggerLoader.loadDocs()

		if (!swaggerDocument) {
			throw new Error("Failed to load Swagger documentation")
		}

		// Serve swagger.json
		router.get("/swagger.json", (req, res) => {
			res.json(swaggerDocument)
		})

		// Basic setup for Swagger UI
		router.use(swaggerUi.serve)

		// Main Swagger UI route
		const setup = swaggerUi.setup(swaggerDocument, swaggerOptions)

		// Handle both base path and all sub-paths
		router.get("/", setup)
		router.get("/*", setup)

		// Health check endpoint
		router.get("/health", (req, res) => {
			try {
				const docs = swaggerLoader.loadDocs()
				const lastLoadTime = swaggerLoader.getLastLoadTime()
				res.json({
					status: "ok",
					endpoints: Object.keys(docs.paths || {}).length,
					lastUpdated: lastLoadTime?.toISOString() || new Date().toISOString(),
					version: docs.info?.version || "unknown",
				})
			} catch (error) {
				logger.error("Swagger health check failed:", error)
				res.status(500).json({
					status: "error",
					message: "Failed to load Swagger documentation",
					timestamp: new Date().toISOString(),
				})
			}
		})

		// Reload documentation endpoint (protected)
		router.post("/reload", (req, res) => {
			try {
				const docs = swaggerLoader.reloadDocs()
				res.json({
					status: "ok",
					message: "Documentation reloaded successfully",
					endpoints: Object.keys(docs.paths || {}).length,
					timestamp: new Date().toISOString(),
				})
			} catch (error) {
				logger.error("Failed to reload Swagger documentation:", error)
				res.status(500).json({
					status: "error",
					message: "Failed to reload documentation",
					timestamp: new Date().toISOString(),
				})
			}
		})

		logger.info("Swagger middleware initialized successfully")
	} catch (error) {
		logger.error("Failed to initialize Swagger middleware:", error)

		// Fallback route handler for all routes
		router.use("*", (req, res) => {
			res.status(500).json({
				status: "error",
				message: "Swagger documentation is currently unavailable",
				details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
				timestamp: new Date().toISOString(),
			})
		})
	}

	return router
}
