import rateLimit from "express-rate-limit"
import {Request, Response} from "express"

export const publicEndpointLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		error: "Too many requests from this IP, please try again after 15 minutes",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req: Request) => {
		// Skip rate limiting for authenticated requests
		return !!req.headers.authorization
	},
})
