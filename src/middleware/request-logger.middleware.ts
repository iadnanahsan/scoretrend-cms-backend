import {Request, Response, NextFunction} from "express"
import logger from "../utils/logger"

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
	const startTime = process.hrtime()
	const timestamp = new Date().toISOString()

	// Log request directly to stdout for immediate visibility
	process.stdout.write(
		`\n${timestamp} - [API REQUEST] ${req.method} ${req.url} - IP: ${req.ip} - User: ${
			req.user?.id || "anonymous"
		} - UserAgent: ${req.get("user-agent")}\n`
	)

	// Also log to the logger for file logging
	logger.debug("Incoming request", {
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
		const responseTimestamp = new Date().toISOString()

		// Log response directly to stdout for immediate visibility
		process.stdout.write(
			`\n${responseTimestamp} - [API RESPONSE] ${req.method} ${req.url} - Status: ${
				res.statusCode
			} - Time: ${responseTime}ms - User: ${req.user?.id || "anonymous"}\n`
		)

		// Also log to the logger for file logging
		logger.debug("Outgoing response", {
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
