import {PrismaClient} from "@prisma/client"
import logger from "../utils/logger"

// Prevent multiple instances in development due to hot reloading
declare global {
	var prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV === "development") {
	global.prisma = prisma
}

// Handle Prisma Client errors
prisma.$use(async (params, next) => {
	try {
		const result = await next(params)
		return result
	} catch (error) {
		logger.error("Prisma Client Error:", {
			error,
			query: params.model + "." + params.action,
		})
		throw error
	}
})

// Handle shutdown
process.on("beforeExit", async () => {
	await prisma.$disconnect()
	logger.info("Prisma Client disconnected")
})

export * from "@prisma/client"
export default prisma
