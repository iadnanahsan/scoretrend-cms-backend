import axios from "axios"
import dotenv from "dotenv"
import logger from "../utils/logger"

// Load environment variables
dotenv.config()

const API_URL = process.env.API_URL || "http://localhost:3000/api/v1"
const POST_ID = "4825f66e-8517-4ef0-b501-ee872df39465"
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN

if (!AUTH_TOKEN) {
	logger.error("TEST_AUTH_TOKEN environment variable is required")
	process.exit(1)
}

async function testUpdatePost() {
	try {
		logger.info(`Testing update post endpoint for post ID: ${POST_ID}`)
		logger.info(`API URL: ${API_URL}`)

		// First, try to get the post to verify it exists
		logger.info("Attempting to get the post first...")
		const getResponse = await axios.get(`${API_URL}/cms/blog/posts/${POST_ID}`, {
			headers: {
				Authorization: `Bearer ${AUTH_TOKEN}`,
			},
		})

		logger.info("Get post response:", getResponse.status)
		logger.info("Post data:", getResponse.data)

		// Now try to update the post
		logger.info("Attempting to update the post...")
		const updateData = {
			status: "DRAFT",
			translations: {
				en: {
					title: "Updated Test Post",
					content: "This is an updated test post content.",
					alias: "updated-test-post",
					seo: {
						title: "Updated Test Post - ScoreTrend",
						description: "This is an updated test post for ScoreTrend CMS.",
						keywords: ["updated", "test", "scoretrend"],
						og_title: "Updated Test Post - ScoreTrend",
						og_description: "This is an updated test post for ScoreTrend CMS.",
						og_image: "https://example.com/image.jpg",
					},
				},
			},
		}

		const updateResponse = await axios.put(`${API_URL}/cms/blog/posts/${POST_ID}`, updateData, {
			headers: {
				Authorization: `Bearer ${AUTH_TOKEN}`,
				"Content-Type": "application/json",
			},
		})

		logger.info("Update post response:", updateResponse.status)
		logger.info("Updated post data:", updateResponse.data)

		logger.info("Test completed successfully")
	} catch (error) {
		logger.error("Error testing update post endpoint:")

		// Type assertion for axios error
		const axiosError = error as any
		if (axiosError.response) {
			logger.error("Status:", axiosError.response.status)
			logger.error("Response data:", axiosError.response.data)
		} else if (axiosError.request) {
			logger.error("No response received:", axiosError.request)
		} else if (error instanceof Error) {
			logger.error("Error message:", axiosError.message)
		} else {
			logger.error("Unknown error:", error)
		}
	}
}

testUpdatePost()
