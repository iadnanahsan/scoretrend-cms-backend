import {Prisma, Page, BlogPost} from "@prisma/client"
import prisma from "../lib/prisma"
import {SupportedLanguage} from "../config/languages"
import {LanguageService} from "./language.service"
import logger from "../utils/logger"
import {SitemapStream, streamToPromise} from "sitemap"
import {Readable} from "stream"

interface RedirectRule {
	source: string
	destination: string
	type: 301 | 302
	isRegex?: boolean
}

interface SlugOptions {
	maxLength?: number
	separator?: string
	lowercase?: boolean
	removeStopWords?: boolean
}

export class URLService {
	private static instance: URLService
	private redirectRules: Map<string, RedirectRule>
	private slugCache: Map<string, string>

	private constructor() {
		this.redirectRules = new Map()
		this.slugCache = new Map()
	}

	public static getInstance(): URLService {
		if (!URLService.instance) {
			URLService.instance = new URLService()
		}
		return URLService.instance
	}

	/**
	 * Generate SEO-friendly slug
	 */
	public generateSlug(text: string, options: SlugOptions = {}): string {
		const {maxLength = 75, separator = "-", lowercase = true, removeStopWords = true} = options

		try {
			// Check cache first
			const cacheKey = `${text}_${JSON.stringify(options)}`
			const cachedSlug = this.slugCache.get(cacheKey)
			if (cachedSlug) return cachedSlug

			// Remove stop words if enabled
			let processedText = text
			if (removeStopWords) {
				const stopWords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to"]
				processedText = stopWords.reduce(
					(text, word) => text.replace(new RegExp(`\\b${word}\\b`, "gi"), ""),
					processedText
				)
			}

			// Generate slug
			let slug = processedText
				.normalize("NFD") // Normalize unicode characters
				.replace(/[\u0300-\u036f]/g, "") // Remove diacritics
				.replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special characters
				.trim()
				.replace(/\s+/g, separator) // Replace spaces with separator

			if (lowercase) {
				slug = slug.toLowerCase()
			}

			// Ensure max length without breaking words
			if (slug.length > maxLength) {
				const words = slug.split(separator)
				slug = ""
				for (const word of words) {
					if ((slug + separator + word).length <= maxLength) {
						slug += (slug ? separator : "") + word
					} else {
						break
					}
				}
			}

			// Cache the result
			this.slugCache.set(cacheKey, slug)

			return slug
		} catch (error) {
			logger.error("Error generating slug:", error)
			throw new Error("Failed to generate slug")
		}
	}

	/**
	 * Add redirect rule
	 */
	public addRedirect(rule: RedirectRule): void {
		try {
			this.redirectRules.set(rule.source, rule)
			logger.info(`Added redirect rule: ${rule.source} -> ${rule.destination}`)
		} catch (error) {
			logger.error("Error adding redirect rule:", error)
			throw new Error("Failed to add redirect rule")
		}
	}

	/**
	 * Check if path matches any redirect rules
	 */
	public getRedirect(path: string): RedirectRule | null {
		try {
			// Check exact matches first
			const exactRule = this.redirectRules.get(path)
			if (exactRule && !exactRule.isRegex) {
				return exactRule
			}

			// Check regex rules
			for (const rule of this.redirectRules.values()) {
				if (rule.isRegex) {
					const regex = new RegExp(rule.source)
					if (regex.test(path)) {
						return {
							...rule,
							destination: path.replace(regex, rule.destination),
						}
					}
				}
			}

			return null
		} catch (error) {
			logger.error("Error checking redirects:", error)
			throw new Error("Failed to check redirects")
		}
	}

	/**
	 * Generate URL for page
	 */
	private generatePageUrl(baseUrl: string, alias: string, language: SupportedLanguage): string {
		// Always include language code for consistency
		return `${baseUrl}/${language}/${alias}`.replace(/\/+/g, "/")
	}

	/**
	 * Generate URL for blog post
	 */
	private generateBlogUrl(baseUrl: string, alias: string, language: SupportedLanguage): string {
		// Always include language code for consistency
		return `${baseUrl}/${language}/blog/${alias}`.replace(/\/+/g, "/")
	}

	/**
	 * Generate sitemap for all content
	 */
	public async generateSitemap(baseUrl: string): Promise<string> {
		try {
			const links: Array<{
				url: string
				lastmod?: string
				changefreq?: string
				priority?: number
				links?: Array<{
					lang: string
					url: string
				}>
			}> = []

			// Add fixed pages
			const pages = await prisma.page.findMany({
				include: {
					translations: true,
				},
			})

			for (const page of pages) {
				// Get all language versions for this page
				const languageAlternates = page.translations.map((translation) => ({
					lang: translation.language,
					url: this.generatePageUrl(baseUrl, translation.alias, translation.language as SupportedLanguage),
				}))

				// Add x-default (using English version as default)
				const defaultTranslation = page.translations.find((t) => t.language === "en")
				if (defaultTranslation) {
					languageAlternates.unshift({
						lang: "x-default",
						url: this.generatePageUrl(baseUrl, defaultTranslation.alias, "en"),
					})
				}

				// Add each language version as a separate URL with alternates
				for (const translation of page.translations) {
					const lang = translation.language as SupportedLanguage
					links.push({
						url: this.generatePageUrl(baseUrl, translation.alias, lang),
						lastmod: page.updated_at.toISOString(),
						// Set priority based on content type (can be made configurable)
						priority: this.getContentPriority(page.type),
						// Set change frequency based on content type (can be made configurable)
						changefreq: this.getChangeFrequency(page.type),
						links: languageAlternates,
					})
				}
			}

			// Add blog posts
			const posts = await prisma.blogPost.findMany({
				where: {
					status: "PUBLISHED",
				},
				include: {
					translations: true,
				},
			})

			for (const post of posts) {
				// Get all language versions for this post
				const languageAlternates = post.translations.map((translation) => ({
					lang: translation.language,
					url: this.generateBlogUrl(baseUrl, translation.alias, translation.language as SupportedLanguage),
				}))

				// Add x-default (using English version as default)
				const defaultTranslation = post.translations.find((t) => t.language === "en")
				if (defaultTranslation) {
					languageAlternates.unshift({
						lang: "x-default",
						url: this.generateBlogUrl(baseUrl, defaultTranslation.alias, "en"),
					})
				}

				// Add each language version as a separate URL with alternates
				for (const translation of post.translations) {
					const lang = translation.language as SupportedLanguage
					links.push({
						url: this.generateBlogUrl(baseUrl, translation.alias, lang),
						lastmod: post.updated_at.toISOString(),
						// Blog posts typically have high priority
						priority: 0.8,
						// Blog posts typically change less frequently
						changefreq: "weekly",
						links: languageAlternates,
					})
				}
			}

			// Ensure we have links before generating sitemap
			if (links.length === 0) {
				logger.warn("No content found for sitemap generation")
				// Return minimal valid sitemap
				return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
       xmlns:xhtml="http://www.w3.org/1999/xhtml">
</urlset>`
			}

			// Create a readable stream from the links array
			const sitemapStream = new SitemapStream({
				hostname: baseUrl,
				xmlns: {
					news: false,
					video: false,
					image: false,
					xhtml: true,
				},
			})

			// Create a promise to handle the stream
			return new Promise((resolve, reject) => {
				try {
					// Convert links to stream
					const linksStream = Readable.from(links)

					// Handle stream errors
					sitemapStream.on("error", reject)

					// Pipe the links through the sitemap stream and convert to string
					streamToPromise(linksStream.pipe(sitemapStream))
						.then((data) => resolve(data.toString()))
						.catch(reject)
				} catch (error) {
					reject(error)
				}
			})
		} catch (error) {
			logger.error("Error generating sitemap:", error)
			throw new Error("Failed to generate sitemap")
		}
	}

	/**
	 * Get content priority based on page type
	 */
	private getContentPriority(pageType: string): number {
		switch (pageType) {
			case "HOME":
				return 1.0
			case "ABOUT":
			case "CONTACT":
				return 0.8
			case "FAQ":
			case "HOW_IT_WORKS":
				return 0.7
			default:
				return 0.5
		}
	}

	/**
	 * Get change frequency based on page type
	 */
	private getChangeFrequency(pageType: string): string {
		switch (pageType) {
			case "HOME":
			case "NEWS":
				return "daily"
			case "BLOG":
				return "weekly"
			case "ABOUT":
			case "CONTACT":
			case "FAQ":
				return "monthly"
			default:
				return "weekly"
		}
	}
}
