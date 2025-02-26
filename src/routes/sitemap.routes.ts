import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {SitemapController} from "../controllers/sitemap.controller"

const router = Router()
const sitemapController = new SitemapController()

// Helper to wrap async route handlers
const asyncHandler =
	(fn: (req: Request, res: Response) => Promise<any>): RequestHandler =>
	async (req, res, next): Promise<void> => {
		try {
			await fn(req, res)
		} catch (error) {
			next(error)
		}
	}

// Get sitemap.xml
router.get(
	"/sitemap.xml",
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sitemapController.getSitemap(req, res)
	})
)

// Get robots.txt
router.get(
	"/robots.txt",
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sitemapController.getRobots(req, res)
	})
)

export default router
