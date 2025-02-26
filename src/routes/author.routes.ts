import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {authenticate} from "../middleware/auth.middleware"
import {validateRequest, validateLanguage} from "../middleware/validation.middleware"
import {AuthorController} from "../controllers/author.controller"
import {createAuthorDetailSchema, updateAuthorDetailSchema} from "../schemas/author.schema"

const router = Router()
const authorController = new AuthorController()

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

// Get current user's author details
router.get(
	"/me",
	authenticate as RequestHandler,
	validateLanguage() as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authorController.getCurrentAuthorDetail(req, res)
	})
)

// Create/Update current user's author details
router.put(
	"/me",
	authenticate as RequestHandler,
	validateRequest(updateAuthorDetailSchema) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authorController.updateCurrentAuthorDetail(req, res)
	})
)

export default router
