import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {UserRole} from "@prisma/client"
import {authenticate} from "../middleware/auth.middleware"
import {authorize} from "../middleware/role.middleware"
import {UserController} from "../controllers/user.controller"

const router = Router()
const userController = new UserController()

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

// List users (Admin only)
router.get(
	"/",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await userController.listUsers(req, res)
	})
)

// Get user by ID
router.get(
	"/:id",
	authenticate as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await userController.getUserById(req, res)
	})
)

// Create user (Admin only)
router.post(
	"/",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await userController.createUser(req, res)
	})
)

// Update user
router.put(
	"/:id",
	authenticate as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await userController.updateUser(req, res)
	})
)

// Delete user (Admin only)
router.delete(
	"/:id",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await userController.deleteUser(req, res)
	})
)

// Update user status (Admin only)
router.patch(
	"/:id/status",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await userController.toggleUserStatus(req, res)
	})
)

export default router
