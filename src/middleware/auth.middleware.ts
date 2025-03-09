import {Request, Response, NextFunction} from "express"
import jwt from "jsonwebtoken"
import {UserRole} from "@prisma/client"
import {TokenPayload, AuthenticatedRequest} from "../types/auth.types"
import logger from "../utils/logger"

declare global {
	namespace Express {
		interface Request {
			user?: TokenPayload
		}
	}
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization

		if (!authHeader?.startsWith("Bearer ")) {
			return res.status(401).json({error: "No token provided", message: "invalid token"})
		}

		const token = authHeader.split(" ")[1]

		if (!token) {
			return res.status(401).json({error: "No token provided", message: "invalid token"})
		}

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
			req.user = decoded
			next()
		} catch (error) {
			logger.error("Token verification failed:", error)
			return res.status(401).json({error: "Invalid token", message: "invalid token"})
		}
	} catch (error) {
		logger.error("Authentication error:", error)
		return res.status(500).json({error: "Authentication failed", message: "authentication failed"})
	}
}

export const authorize = (roles: UserRole[]) => {
	return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				return res.status(401).json({error: "Not authenticated"})
			}

			if (!roles.includes(req.user.role)) {
				return res.status(403).json({error: "Insufficient permissions"})
			}

			next()
		} catch (error) {
			logger.error("Authorization error:", error)
			return res.status(500).json({error: "Authorization failed"})
		}
	}
}
