import {Request, Response} from "express"
import {PageService} from "../services/page.service"
import {PageType} from "@prisma/client"
import logger from "../utils/logger"
import {SEOData} from "../types/page.types"

export class PageController {
	private pageService: PageService

	constructor() {
		this.pageService = new PageService()
	}

	/**
	 * Get page content
	 */
	public async getPageContent(req: Request, res: Response): Promise<void> {
		try {
			const {pageType} = req.params
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			if (!Object.values(PageType).includes(pageType as PageType)) {
				res.status(400).json({error: "Invalid page type"})
				return
			}

			const page = await this.pageService.getPageContent(pageType as PageType, language)
			res.json(page)
		} catch (error) {
			logger.error("Error getting page content:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get page content"})
		}
	}

	/**
	 * Update page translation
	 */
	public async updatePageTranslation(req: Request, res: Response): Promise<void> {
		try {
			const {pageId} = req.params
			// Get language from either query parameter or body (set from path parameter)
			const language = req.query.language || req.body.language
			const {alias, seo_data} = req.body

			if (!language || !alias || !seo_data) {
				res.status(400).json({
					error: "Missing required fields",
					details: {
						language: !language ? "Language is required (use query parameter ?language=xx)" : undefined,
						alias: !alias ? "Alias is required" : undefined,
						seo_data: !seo_data ? "SEO data is required" : undefined,
					},
				})
				return
			}

			const translation = await this.pageService.updatePageTranslation(pageId, language as string, {
				alias,
				seo_data,
			})
			res.json(translation)
		} catch (error) {
			logger.error("Error updating page translation:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update page translation"})
		}
	}

	/**
	 * Get page SEO data
	 */
	public async getPageSEO(req: Request, res: Response): Promise<void> {
		try {
			const {pageId} = req.params
			const {language} = req.query

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			const seoData = await this.pageService.getPageSEO(pageId, language)
			res.json(seoData)
		} catch (error) {
			logger.error("Error getting page SEO:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to get page SEO"})
		}
	}

	/**
	 * Update page SEO data
	 */
	public async updatePageSEO(req: Request, res: Response): Promise<void> {
		try {
			const {pageId} = req.params
			const {language} = req.query
			// Handle both formats: direct SEO data or wrapped in seo_data
			const seo_data = req.body.seo_data || req.body

			if (!language || typeof language !== "string") {
				res.status(400).json({error: "Language parameter is required"})
				return
			}

			// Validate required fields in SEO data
			if (!seo_data || typeof seo_data !== "object") {
				res.status(400).json({
					error: "SEO data is required and must be an object",
					details: {
						format: {
							example: {
								basics: {
									title: "Required",
									description: "Required",
									canonical_url: "Optional",
								},
								openGraph: {
									title: "Required",
									description: "Required",
									type: "Required (website or article)",
									image: "Optional",
								},
								twitter: {
									card: "Required (summary or summary_large_image)",
									title: "Required",
									description: "Required",
									image: "Optional",
								},
							},
						},
					},
				})
				return
			}

			// Validate basics section
			if (!seo_data.basics?.title || !seo_data.basics?.description) {
				res.status(400).json({
					error: "Missing required fields in basics section",
					details: {
						basics: {
							title: !seo_data.basics?.title ? "Title is required" : undefined,
							description: !seo_data.basics?.description ? "Description is required" : undefined,
						},
					},
				})
				return
			}

			// Validate openGraph section
			if (!seo_data.openGraph?.title || !seo_data.openGraph?.description || !seo_data.openGraph?.type) {
				res.status(400).json({
					error: "Missing required fields in openGraph section",
					details: {
						openGraph: {
							title: !seo_data.openGraph?.title ? "Title is required" : undefined,
							description: !seo_data.openGraph?.description ? "Description is required" : undefined,
							type: !seo_data.openGraph?.type ? "Type is required (website or article)" : undefined,
						},
					},
				})
				return
			}

			// Validate twitter section
			if (!seo_data.twitter?.card || !seo_data.twitter?.title || !seo_data.twitter?.description) {
				res.status(400).json({
					error: "Missing required fields in twitter section",
					details: {
						twitter: {
							card: !seo_data.twitter?.card
								? "Card type is required (summary or summary_large_image)"
								: undefined,
							title: !seo_data.twitter?.title ? "Title is required" : undefined,
							description: !seo_data.twitter?.description ? "Description is required" : undefined,
						},
					},
				})
				return
			}

			// Additional validation for specific values
			if (seo_data.openGraph?.type && !["website", "article"].includes(seo_data.openGraph.type)) {
				res.status(400).json({
					error: "Invalid openGraph type",
					details: {
						openGraph: {
							type: "Must be either 'website' or 'article'",
						},
					},
				})
				return
			}

			if (seo_data.twitter?.card && !["summary", "summary_large_image"].includes(seo_data.twitter.card)) {
				res.status(400).json({
					error: "Invalid twitter card type",
					details: {
						twitter: {
							card: "Must be either 'summary' or 'summary_large_image'",
						},
					},
				})
				return
			}

			const translation = await this.pageService.updatePageSEO(pageId, language, seo_data)
			res.json(translation)
		} catch (error) {
			logger.error("Error updating page SEO:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to update page SEO"})
		}
	}

	/**
	 * Initialize fixed pages
	 */
	public async initializeFixedPages(req: Request, res: Response): Promise<void> {
		try {
			await this.pageService.initializeFixedPages()
			res.json({message: "Fixed pages initialized successfully"})
		} catch (error) {
			logger.error("Error initializing fixed pages:", error)
			if (error instanceof Error) {
				res.status(400).json({error: error.message})
				return
			}
			res.status(500).json({error: "Failed to initialize fixed pages"})
		}
	}
}
