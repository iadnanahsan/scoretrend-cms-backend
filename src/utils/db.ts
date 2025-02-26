import {PrismaClient} from "@prisma/client"
import logger from "./logger"

const prisma = new PrismaClient()

export async function testConnection(): Promise<boolean> {
	try {
		// Test the connection by querying the database version
		const result = await prisma.$queryRaw`SELECT version()`
		logger.info("Database connection successful")
		logger.debug("Database version:", result)
		return true
	} catch (error) {
		logger.error("Database connection failed:", error)
		return false
	}
}

export async function initializeDatabase(): Promise<void> {
	try {
		await testConnection()
		logger.info("Database initialization complete")
	} catch (error) {
		logger.error("Database initialization failed:", error)
		throw error
	}
}

export default prisma
