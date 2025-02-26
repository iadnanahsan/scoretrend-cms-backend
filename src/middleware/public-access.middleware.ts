import {Request, Response, NextFunction} from "express"
import {authenticate} from "./auth.middleware"
import logger from "../utils/logger"

export const publicOrAuthenticated = (req: Request, res: Response, next: NextFunction) => {
	// Skip authentication for GET requests
	if (req.method === "GET") {
		return next()
	}

	// Apply authentication for all other methods
	return authenticate(req, res, next)
}
