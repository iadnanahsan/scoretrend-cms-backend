import {Request, Response} from "express"
import {UserService} from "../services/user.service"
import logger from "../utils/logger"
import {Prisma, UserRole, UserStatus} from "@prisma/client"
import {CreateUserData, UpdateUserData} from "../types/user.types"

export class UserController {
	private userService: UserService

	constructor() {
		this.userService = new UserService()
	}

	// List users with pagination and filters
	public async listUsers(req: Request, res: Response): Promise<void> {
		try {
			const {page = 1, limit = 10, role, status, search} = req.query
			const skip = (Number(page) - 1) * Number(limit)
			const take = Number(limit)

			const where: Prisma.UserWhereInput = {}
			if (role) where.role = role as UserRole
			if (status) where.status = status as UserStatus

			const result = await this.userService.listUsers({
				skip,
				take,
				where,
				orderBy: {created_at: "desc"},
				search: search as string,
			})

			const totalPages = Math.ceil(result.total / take)

			res.json({
				users: result.users,
				pagination: {
					total: result.total,
					page: Number(page),
					limit: take,
					pages: totalPages,
				},
			})
		} catch (error) {
			logger.error("Error listing users:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				res.status(400).json({error: "Invalid request parameters"})
				return
			}
			res.status(500).json({error: "Failed to list users"})
		}
	}

	// Get user by ID
	public async getUserById(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const user = await this.userService.findUserById(id)
			if (!user) {
				res.status(404).json({error: "User not found"})
				return
			}
			res.json(user)
		} catch (error) {
			logger.error("Error getting user:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid user ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to get user"})
		}
	}

	// Create new user
	public async createUser(req: Request, res: Response): Promise<void> {
		try {
			const userData = req.body as CreateUserData
			const user = await this.userService.createUser(userData)
			res.status(201).json(user)
		} catch (error) {
			logger.error("Error creating user:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2002") {
					res.status(409).json({error: "Email already exists"})
					return
				}
			}
			res.status(500).json({error: "Failed to create user"})
		}
	}

	// Update user
	public async updateUser(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const userData = req.body as UpdateUserData
			const user = await this.userService.updateUser(id, userData)
			if (!user) {
				res.status(404).json({error: "User not found"})
				return
			}
			res.json(user)
		} catch (error) {
			logger.error("Error updating user:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2002") {
					res.status(409).json({error: "Email already exists"})
					return
				}
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid user ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to update user"})
		}
	}

	// Delete user
	public async deleteUser(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			await this.userService.deleteUser(id)
			res.status(204).send()
		} catch (error) {
			logger.error("Error deleting user:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2025") {
					res.status(404).json({error: "User not found"})
					return
				}
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid user ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to delete user"})
		}
	}

	// Toggle user status
	public async toggleUserStatus(req: Request, res: Response): Promise<void> {
		try {
			const {id} = req.params
			const {status} = req.body as {status: UserStatus}
			const user = await this.userService.updateUser(id, {status})
			if (!user) {
				res.status(404).json({error: "User not found"})
				return
			}
			res.json(user)
		} catch (error) {
			logger.error("Error updating user status:", error)
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === "P2023") {
					res.status(400).json({error: "Invalid user ID format"})
					return
				}
			}
			res.status(500).json({error: "Failed to update user status"})
		}
	}
}
