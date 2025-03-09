import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {UserRole} from "@prisma/client"
import {validateRequest} from "../middleware/validation.middleware"
import {authenticate} from "../middleware/auth.middleware"
import {authorize} from "../middleware/role.middleware"
import {registerUserSchema, loginUserSchema, resetPasswordSchema, forgotPasswordSchema} from "../schemas/user.schema"
import {AuthController} from "../controllers/auth.controller"

const router = Router()
const authController = new AuthController()

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

// Admin-only registration
router.post(
	"/register",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateRequest(registerUserSchema) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authController.register(req, res)
	})
)

// Public routes
router.post(
	"/login",
	validateRequest(loginUserSchema) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authController.login(req, res)
	})
)

router.post(
	"/forgot-password",
	validateRequest(forgotPasswordSchema) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authController.forgotPassword(req, res)
	})
)

router.post(
	"/reset-password",
	validateRequest(resetPasswordSchema) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authController.resetPassword(req, res)
	})
)

// Protected route
router.post(
	"/logout",
	authenticate as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await authController.logout(req, res)
	})
)

export default router
