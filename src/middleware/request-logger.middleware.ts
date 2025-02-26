import {Request, Response, NextFunction} from "express"
import logger from "../utils/logger"

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
	const startTime = process.hrtime()

	// Log request
	logger.info("Incoming request", {
		method: req.method,
		url: req.url,
		query: req.query,
		body: req.method !== "GET" ? req.body : undefined,
		userId: req.user?.id,
		ip: req.ip,
		userAgent: req.get("user-agent"),
	})

	// Add response logging
	const originalSend = res.send
	res.send = function (body) {
		const endTime = process.hrtime(startTime)
		const responseTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)

		logger.info("Outgoing response", {
			method: req.method,
			url: req.url,
			statusCode: res.statusCode,
			responseTime: `${responseTime}ms`,
			userId: req.user?.id,
		})

		return originalSend.call(this, body)
	}

	next()
}
