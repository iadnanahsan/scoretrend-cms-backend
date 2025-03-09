import {Router, Request, Response, NextFunction, RequestHandler} from "express"
import {ParamsDictionary} from "express-serve-static-core"
import {UserRole} from "@prisma/client"
import {authenticate} from "../middleware/auth.middleware"
import {authorize} from "../middleware/role.middleware"
import {BlogController} from "../controllers/blog.controller"
import {validateRequest} from "../middleware/validation.middleware"
import {publicOrAuthenticated} from "../middleware/public-access.middleware"
import {publicEndpointLimiter, commentRateLimiter} from "../middleware/rate-limit.middleware"
import {
	createCategorySchema,
	updateCategorySchema,
	createPostSchema,
	updatePostSchema,
	createCommentSchema,
	updateCommentSchema,
	moderateCommentSchema,
	UpdateCategoryInput,
	CreateBlogPostRequest,
	UpdateBlogPostRequest,
	CreateCommentRequest,
	UpdateCommentRequest,
	ModerateCommentRequest,
} from "../schemas/blog.schema"

const router = Router()
const blogController = new BlogController()

// Helper to wrap async route handlers
const asyncHandler =
	<P = ParamsDictionary, ResBody = any, ReqBody = any>(
		fn: (req: Request<P, ResBody, ReqBody>, res: Response) => Promise<any>
	): RequestHandler<P, ResBody, ReqBody> =>
	async (req, res, next): Promise<void> => {
		try {
			await fn(req, res)
		} catch (error) {
			next(error)
		}
	}

// List categories with pagination
router.get(
	"/categories",
	publicOrAuthenticated as RequestHandler,
	publicEndpointLimiter,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.listCategories(req, res)
	})
)

// Create category (Admin only)
router.post(
	"/categories",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateRequest(createCategorySchema) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.createCategory(req, res)
	})
)

// Get category by ID
router.get(
	"/categories/:id",
	publicOrAuthenticated as RequestHandler,
	publicEndpointLimiter,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.getCategoryById(req, res)
	})
)

// Update category (Admin only)
router.put(
	"/categories/:id",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateRequest(updateCategorySchema) as RequestHandler,
	asyncHandler<{id: string}, any, UpdateCategoryInput>(async (req, res): Promise<any> => {
		await blogController.updateCategory(req, res)
	})
)

// Delete category (Admin only)
router.delete(
	"/categories/:id",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.deleteCategory(req, res)
	})
)

// Post Routes
router.get(
	"/posts",
	publicOrAuthenticated as RequestHandler,
	publicEndpointLimiter,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.listPosts(req, res)
	})
)

router.post(
	"/posts",
	authenticate as RequestHandler,
	validateRequest(createPostSchema) as RequestHandler,
	asyncHandler<{}, any, CreateBlogPostRequest>(async (req, res): Promise<any> => {
		await blogController.createPost(req, res)
	})
)

// Get all blog post aliases - IMPORTANT: This route must be defined BEFORE the /posts/:id route
router.get(
	"/posts/aliases",
	publicEndpointLimiter,
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.getAllAliases(req, res)
	})
)

// Get post by alias - IMPORTANT: This route must be defined BEFORE the /posts/:id route
router.get(
	"/posts/by-alias/:alias",
	publicOrAuthenticated as RequestHandler,
	publicEndpointLimiter,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.getPostByAlias(req, res)
	})
)

router.get(
	"/posts/:id",
	publicOrAuthenticated as RequestHandler,
	publicEndpointLimiter,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.getPostById(req, res)
	})
)

router.put(
	"/posts/:id",
	authenticate as RequestHandler,
	validateRequest(updatePostSchema) as RequestHandler,
	asyncHandler<{id: string}, any, UpdateBlogPostRequest>(async (req, res): Promise<any> => {
		await blogController.updatePost(req, res)
	})
)

router.delete(
	"/posts/:id",
	authenticate as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.deletePost(req, res)
	})
)

// Comment Routes
router.get(
	"/posts/:postId/comments",
	publicOrAuthenticated as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.getPostComments(req, res)
	})
)

router.post(
	"/posts/:postId/comments",
	validateRequest(createCommentSchema) as RequestHandler,
	commentRateLimiter,
	asyncHandler<{postId: string}, any, CreateCommentRequest>(async (req, res): Promise<any> => {
		await blogController.createComment(req, res)
	})
)

// Protected comment operations
router.put(
	"/comments/:id",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateRequest(updateCommentSchema) as RequestHandler,
	asyncHandler<{id: string}, any, UpdateCommentRequest>(async (req, res): Promise<any> => {
		await blogController.updateComment(req, res)
	})
)

router.patch(
	"/comments/:id/moderate",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	validateRequest(moderateCommentSchema) as RequestHandler,
	asyncHandler<{id: string}, any, ModerateCommentRequest>(async (req, res): Promise<any> => {
		await blogController.moderateComment(req, res)
	})
)

router.delete(
	"/comments/:id",
	authenticate as RequestHandler,
	authorize([UserRole.ADMIN]) as RequestHandler,
	asyncHandler(async (req: Request, res: Response): Promise<any> => {
		await blogController.deleteComment(req, res)
	})
)

export default router
