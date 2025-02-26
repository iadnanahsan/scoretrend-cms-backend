import {Request, Response, NextFunction} from "express"
import {Page} from "@prisma/client"
import prisma from "../lib/prisma"
import {isValidUUID, ValidationError, NotFoundError} from "../utils/validation"
import logger from "../utils/logger"

// Extend Express Request type to include page
declare global {
	namespace Express {
		interface Request {
			page?: Page
		}
	}
}

/**
 * Middleware to validate page existence and attach to request
 */
export const validatePage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const {pageId} = req.params

		// Validate UUID format
		if (!isValidUUID(pageId)) {
			throw new ValidationError("Invalid page ID format", {field: "pageId"})
		}

		// Check if page exists
		const page = await prisma.page.findUnique({
			where: {id: pageId},
		})

		if (!page) {
			throw new NotFoundError(`Page not found: ${pageId}`)
		}

		// Attach page to request for later use
		req.page = page
		next()
	} catch (error) {
		logger.error("Page validation error:", error)

		if (error instanceof ValidationError) {
			res.status(400).json({
				error: error.message,
				details: error.details,
			})
			return
		}

		if (error instanceof NotFoundError) {
			res.status(404).json({error: error.message})
			return
		}

		next(error)
	}
}

/**
 * Middleware to validate section existence
 */
export const validateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const {sectionId} = req.params

		// Validate UUID format
		if (!isValidUUID(sectionId)) {
			throw new ValidationError("Invalid section ID format", {field: "sectionId"})
		}

		// Check if section exists and belongs to the page
		const section = await prisma.section.findFirst({
			where: {
				id: sectionId,
				page_id: req.page?.id,
			},
		})

		if (!section) {
			throw new NotFoundError(`Section not found: ${sectionId}`)
		}

		next()
	} catch (error) {
		logger.error("Section validation error:", error)

		if (error instanceof ValidationError) {
			res.status(400).json({
				error: error.message,
				details: error.details,
			})
			return
		}

		if (error instanceof NotFoundError) {
			res.status(404).json({error: error.message})
			return
		}

		next(error)
	}
}
