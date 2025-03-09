import rateLimit from "express-rate-limit"
import {Request, Response} from "express"

export const publicEndpointLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 500, // Increased from 100 to 300 requests per windowMs
	message: {
		error: "Too many requests from this IP, please try again after 15 minutes",
		message: "Too many requests, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req: Request) => {
		// Skip rate limiting for authenticated requests
		return !!req.headers.authorization
	},
})

// Stricter rate limiter for comment creation to prevent spam
export const commentRateLimiter = rateLimit({
	windowMs: 3 * 60 * 1000, // 3 minutes
	max: 1, // Limit each IP to 1 comment per 3 minutes
	message: {
		error: "To prevent spam, please wait 3 minutes before posting another comment.",
		message: "To prevent spam, please wait 3 minutes before posting another comment.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req: Request) => {
		// Skip rate limiting for authenticated requests
		return !!req.headers.authorization
	},
})
