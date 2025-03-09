import {Request, Response, NextFunction} from "express"
import {authenticate} from "./auth.middleware"
import jwt from "jsonwebtoken"
import {TokenPayload} from "../types/auth.types"
import logger from "../utils/logger"

export const publicOrAuthenticated = (req: Request, res: Response, next: NextFunction) => {
	// For GET requests, try to authenticate but don't require it
	if (req.method === "GET") {
		// Try to extract and verify token if present
		try {
			const authHeader = req.headers.authorization

			if (authHeader?.startsWith("Bearer ")) {
				const token = authHeader.split(" ")[1]

				if (token) {
					try {
						const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
						req.user = decoded
					} catch (error) {
						// Just log the error but don't block the request
						logger.debug("Token verification failed for public route:", error)
					}
				}
			}
		} catch (error) {
			// Just log the error but don't block the request
			logger.debug("Token verification failed for public route:", error)
		}

		// Always proceed for GET requests
		return next()
	}

	// Apply authentication for all other methods
	return authenticate(req, res, next)
}
