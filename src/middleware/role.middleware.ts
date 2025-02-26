import {Request, Response, NextFunction} from "express"
import {UserRole} from "@prisma/client"
import {AuthenticatedRequest} from "../types/auth.types"

export const authorize = (roles: UserRole[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const authReq = req as AuthenticatedRequest

		if (!authReq.user) {
			return res.status(401).json({
				status: "error",
				message: "Unauthorized - No user found in request",
			})
		}

		if (!roles.includes(authReq.user.role)) {
			return res.status(403).json({
				status: "error",
				message: "Forbidden - Insufficient permissions",
			})
		}

		next()
	}
}
