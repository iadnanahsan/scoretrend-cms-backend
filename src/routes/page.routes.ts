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

// Get page content
router.get(
	"/:pageType",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.getPageContent(req, res)
	})
)

// Get page content by language
router.get(
	"/:pageType/translations/:lang",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		req.query.language = req.params.lang
		await pageController.getPageContent(req, res)
	})
)

// New cleaner translation update endpoint
router.put(
	"/:pageId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateUUID("pageId") as RequestHandler,
	validateLanguage() as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.updatePageTranslation(req, res)
	})
)

// Update page translation with path param (deprecated but maintained for backward compatibility)
router.put(
	"/:pageId/translations/:lang",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		// Add deprecation warning header
		res.setHeader(
			"Warning",
			'299 - "This endpoint is deprecated, use PUT /api/v1/cms/pages/{pageId}?language=xx instead"'
		)
		req.body.language = req.params.lang
		await pageController.updatePageTranslation(req, res)
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

// Update page SEO data
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

// Initialize fixed pages (Admin only)
router.post(
	"/initialize",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await pageController.initializeFixedPages(req, res)
	})
)

export default router
