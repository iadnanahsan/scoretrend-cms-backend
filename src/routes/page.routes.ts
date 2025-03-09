import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {UserRole} from "@prisma/client"
import {authenticate} from "../middleware/auth.middleware"
import {authorize} from "../middleware/role.middleware"
import {PageController} from "../controllers/page.controller"
import {validateUUID, validateLanguage} from "../middleware/validation.middleware"
import {publicOrAuthenticated} from "../middleware/public-access.middleware"
import {publicEndpointLimiter} from "../middleware/rate-limit.middleware"

const router = Router()
const pageController = new PageController()

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

// Get all page aliases - IMPORTANT: This route must be defined BEFORE the /:pageType route
router.get(
	"/aliases",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.getAllAliases(req, res)
	})
)

// Get page by alias - IMPORTANT: This route must be defined BEFORE the /:pageType route
router.get(
	"/by-alias/:alias",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	validateLanguage() as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.getPageByAlias(req, res)
	})
)

// Initialize fixed pages (Admin only)
router.post(
	"/initialize",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.initializeFixedPages(req, res)
	})
)

// Get page content
router.get(
	"/:pageType",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.getPageContent(req, res)
	})
)

// Get page SEO data
router.get(
	"/:pageId/seo",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	validateUUID("pageId") as RequestHandler,
	validateLanguage() as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.getPageSEO(req, res)
	})
)

// Update page SEO data (now includes alias)
router.put(
	"/:pageId/seo",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateUUID("pageId") as RequestHandler,
	validateLanguage() as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.updatePageSEO(req, res)
	})
)

export default router
