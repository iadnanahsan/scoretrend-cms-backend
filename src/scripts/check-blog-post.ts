import {PrismaClient} from "@prisma/client"
import logger from "../utils/logger"

const prisma = new PrismaClient()

async function checkBlogPost() {
	try {
		const postId = "4825f66e-8517-4ef0-b501-ee872df39465"
		logger.info(`Checking for blog post with ID: ${postId}`)

		// Try with original case
		const post = await prisma.blogPost.findUnique({
			where: {id: postId},
			select: {
				id: true,
				status: true,
				author_id: true,
				category_id: true,
				created_at: true,
			},
		})

		logger.info("Result with original case:", post)

		// Try with lowercase
		const postLower = await prisma.blogPost.findUnique({
			where: {id: postId.toLowerCase()},
			select: {
				id: true,
				status: true,
				author_id: true,
				category_id: true,
				created_at: true,
			},
		})

		logger.info("Result with lowercase:", postLower)

		// Try with uppercase
		const postUpper = await prisma.blogPost.findUnique({
			where: {id: postId.toUpperCase()},
			select: {
				id: true,
				status: true,
				author_id: true,
				category_id: true,
				created_at: true,
			},
		})

		logger.info("Result with uppercase:", postUpper)

		// List all blog posts
		const allPosts = await prisma.blogPost.findMany({
			take: 5,
			select: {
				id: true,
				status: true,
			},
		})

		logger.info("First 5 blog posts in database:", allPosts)
	} catch (error) {
		logger.error("Error checking blog post:", error)
	} finally {
		await prisma.$disconnect()
	}
}

checkBlogPost()
	.then(() => logger.info("Check completed"))
	.catch((e) => logger.error("Error running check:", e))
