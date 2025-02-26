import {PrismaClient, UserRole, UserStatus} from "@prisma/client"
import * as bcrypt from "bcrypt"
import logger from "../src/utils/logger"

const prisma = new PrismaClient()

async function main() {
	try {
		logger.info("Starting database seeding...")

		// Check if admin already exists
		const existingAdmin = await prisma.user.findFirst({
			where: {
				email: "admin@scoretrend.com",
				role: "ADMIN",
			},
		})

		if (existingAdmin) {
			logger.info("Admin account already exists, skipping seed")
			return
		}

		// Create admin user
		const hashedPassword = await bcrypt.hash("admin1234", 12)
		const admin = await prisma.user.create({
			data: {
				email: "admin@scoretrend.com",
				password: hashedPassword,
				name: "ScoreTrend Admin",
				role: UserRole.ADMIN,
				status: UserStatus.ACTIVE,
				email_verified: true,
				email_verified_at: new Date(),
				created_at: new Date(),
				updated_at: new Date(),
			},
		})

		// Create admin author details
		await prisma.authorDetail.create({
			data: {
				user_id: admin.id,
				profile_image_url: null,
				created_at: new Date(),
				updated_at: new Date(),
				translations: {
					create: [
						{
							language: "en",
							name: "ScoreTrend Admin",
							description: "System administrator for ScoreTrend CMS",
						},
						{
							language: "it",
							name: "Amministratore ScoreTrend",
							description: "Amministratore di sistema per ScoreTrend CMS",
						},
						{
							language: "pt",
							name: "Administrador ScoreTrend",
							description: "Administrador do sistema ScoreTrend CMS",
						},
						{
							language: "es",
							name: "Administrador ScoreTrend",
							description: "Administrador del sistema ScoreTrend CMS",
						},
					],
				},
			},
		})

		logger.info("Database seeding completed successfully")
		logger.info("Admin account created with email: admin@scoretrend.com")
		logger.info("Please change the admin password after first login")
	} catch (error) {
		logger.error("Error seeding database:", error)
		throw error
	}
}

main()
	.catch((error) => {
		logger.error("Fatal error during seeding:", error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
