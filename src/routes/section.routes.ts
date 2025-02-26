import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {UserRole} from "@prisma/client"
import {authenticate} from "../middleware/auth.middleware"
import {authorize} from "../middleware/role.middleware"
import {validatePage, validateSection} from "../middleware/page.middleware"
import {SectionController} from "../controllers/section.controller"
import {publicOrAuthenticated} from "../middleware/public-access.middleware"
import {publicEndpointLimiter} from "../middleware/rate-limit.middleware"

const router = Router()
const sectionController = new SectionController()

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

// Get all sections for a page
router.get(
	"/:pageId/sections",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	validatePage as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sectionController.getSections(req, res)
	})
)

// Create new section
router.post(
	"/:pageId/sections",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validatePage as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sectionController.createSection(req, res)
	})
)

// Get section by ID
router.get(
	"/:pageId/sections/:sectionId",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	validatePage as RequestHandler,
	validateSection as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sectionController.getSectionById(req, res)
	})
)

// Update section translation
router.put(
	"/:pageId/sections/:sectionId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validatePage as RequestHandler,
	validateSection as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sectionController.updateSectionTranslation(req, res)
	})
)

// Delete section
router.delete(
	"/:pageId/sections/:sectionId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validatePage as RequestHandler,
	validateSection as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sectionController.deleteSection(req, res)
	})
)

// Update section order
router.patch(
	"/:pageId/sections/:sectionId/order",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validatePage as RequestHandler,
	validateSection as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await sectionController.updateSectionOrder(req, res)
	})
)

export default router
