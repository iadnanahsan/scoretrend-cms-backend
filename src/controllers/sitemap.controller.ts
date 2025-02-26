import {Request, Response} from "express"
import {URLService} from "../services/url.service"
import logger from "../utils/logger"
import CONFIG from "../config"

export class SitemapController {
	private urlService: URLService

	constructor() {
		this.urlService = URLService.getInstance()
	}

	/**
	 * Generate and serve sitemap
	 */
	public async getSitemap(req: Request, res: Response): Promise<void> {
		try {
			const protocol = req.protocol
			const host = req.get("host") || CONFIG.HOST
			const baseUrl = `${protocol}://${host}`

			// Generate sitemap with error handling
			const sitemap = await this.urlService.generateSitemap(baseUrl)

			// Set proper headers
			res.header("Content-Type", "application/xml")
			res.header("Content-Length", Buffer.byteLength(sitemap).toString())
			res.header("Cache-Control", "public, max-age=3600") // Cache for 1 hour

			// Send the XML response
			res.send(sitemap)
		} catch (error) {
			logger.error("Error generating sitemap:", error)
			res.status(500).json({
				error: "Failed to generate sitemap",
				code: "INTERNAL_SERVER_ERROR",
				details: error instanceof Error ? error.message : "Unknown error",
			})
		}
	}

	/**
	 * Generate and serve robots.txt
	 */
	public async getRobots(req: Request, res: Response): Promise<void> {
		try {
			const protocol = req.protocol
			const host = req.get("host") || CONFIG.HOST
			const baseUrl = `${protocol}://${host}`

			const robotsTxt = [
				"User-agent: *",
				"Allow: /",
				"Disallow: /api/",
				"Disallow: /admin/",
				"",
				`Sitemap: ${baseUrl}/sitemap.xml`,
			].join("\n")

			// Set proper headers
			res.header("Content-Type", "text/plain")
			res.header("Content-Length", Buffer.byteLength(robotsTxt).toString())
			res.header("Cache-Control", "public, max-age=86400") // Cache for 24 hours

			res.send(robotsTxt)
		} catch (error) {
			logger.error("Error generating robots.txt:", error)
			res.status(500).json({
				error: "Failed to generate robots.txt",
				code: "INTERNAL_SERVER_ERROR",
				details: error instanceof Error ? error.message : "Unknown error",
			})
		}
	}
}
