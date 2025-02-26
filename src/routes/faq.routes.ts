import {Router, Request, Response, RequestHandler} from "express"
import {UserRole} from "@prisma/client"
import {authenticate} from "../middleware/auth.middleware"
import {authorize} from "../middleware/role.middleware"
import {FAQController} from "../controllers/faq.controller"
import {publicOrAuthenticated} from "../middleware/public-access.middleware"
import {publicEndpointLimiter} from "../middleware/rate-limit.middleware"

const router = Router()
const faqController = new FAQController()

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

// Get all FAQs
router.get(
	"/",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.getAllFAQs(req, res)
	})
)

// Create FAQ category
router.post(
	"/categories",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.createCategory(req, res)
	})
)

// Update FAQ category
router.put(
	"/categories/:categoryId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.updateCategory(req, res)
	})
)

// Delete FAQ category
router.delete(
	"/categories/:categoryId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.deleteCategory(req, res)
	})
)

// Update FAQ category order
router.patch(
	"/categories/:categoryId/order",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.updateCategoryOrder(req, res)
	})
)

// Add FAQ item to category
router.post(
	"/categories/:categoryId/items",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.addItem(req, res)
	})
)

// Update FAQ item
router.put(
	"/items/:itemId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.updateItem(req, res)
	})
)

// Delete FAQ item
router.delete(
	"/items/:itemId",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.deleteItem(req, res)
	})
)

// Update FAQ item order
router.patch(
	"/items/:itemId/order",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.updateItemOrder(req, res)
	})
)

// Get all categories (without items)
router.get(
	"/categories",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.getCategories(req, res)
	})
)

// Get single category
router.get(
	"/categories/:categoryId",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.getCategory(req, res)
	})
)

// Get category items
router.get(
	"/categories/:categoryId/items",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await faqController.getCategoryItems(req, res)
	})
)

export default router
