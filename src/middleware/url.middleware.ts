import {Request, Response, NextFunction} from "express"
import {URLService} from "../services/url.service"
import logger from "../utils/logger"

/**
 * Middleware to handle URL redirects
 */
export const handleRedirects = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const urlService = URLService.getInstance()
			const redirect = urlService.getRedirect(req.path)

			if (redirect) {
				logger.info(`Redirecting ${req.path} to ${redirect.destination}`)
				res.redirect(redirect.type, redirect.destination)
				return
			}

			next()
		} catch (error) {
			logger.error("Error handling redirect:", error)
			next(error)
		}
	}
}

/**
 * Middleware to serve sitemap
 */
export const serveSitemap = (baseUrl: string) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const urlService = URLService.getInstance()
			const sitemap = await urlService.generateSitemap(baseUrl)

			res.header("Content-Type", "application/xml")
			res.send(sitemap)
		} catch (error) {
			logger.error("Error serving sitemap:", error)
			next(error)
		}
	}
}

/**
 * Middleware to validate and normalize slugs
 */
export const validateSlug = (options?: {maxLength?: number; separator?: string}) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const urlService = URLService.getInstance()
			const slug = req.params.slug || req.body.slug

			if (slug) {
				const normalizedSlug = urlService.generateSlug(slug, options)
				req.params.slug = normalizedSlug
				if (req.body.slug) {
					req.body.slug = normalizedSlug
				}
			}

			next()
		} catch (error) {
			logger.error("Error validating slug:", error)
			next(error)
		}
	}
}
