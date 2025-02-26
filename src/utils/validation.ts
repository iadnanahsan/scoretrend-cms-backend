import logger from "./logger"

/**
 * Validates if a string is a valid UUID v4
 * @param uuid String to validate
 * @returns boolean indicating if string is valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
	try {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		return uuidRegex.test(uuid)
	} catch (error) {
		logger.error("UUID validation error:", error)
		return false
	}
}

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
	constructor(message: string, public details?: Record<string, any>) {
		super(message)
		this.name = "ValidationError"
	}
}

/**
 * Custom error for resource not found
 */
export class NotFoundError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "NotFoundError"
	}
}
