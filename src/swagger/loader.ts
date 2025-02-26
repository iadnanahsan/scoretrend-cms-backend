import fs from "fs"
import path from "path"
import yaml from "js-yaml"
import logger from "../utils/logger"

interface SwaggerDocument {
	[key: string]: any
}

export class SwaggerLoader {
	private static instance: SwaggerLoader
	private swaggerDocument: SwaggerDocument | null = null
	private readonly docsPath: string
	private lastLoadTime: Date | null = null

	private constructor() {
		this.docsPath = path.resolve(__dirname, "docs")
		logger.info("Swagger docs path:", this.docsPath)
	}

	public static getInstance(): SwaggerLoader {
		if (!SwaggerLoader.instance) {
			SwaggerLoader.instance = new SwaggerLoader()
		}
		return SwaggerLoader.instance
	}

	private validateSwaggerDocument(doc: any): boolean {
		try {
			// Required OpenAPI fields
			const requiredFields = ["openapi", "info", "paths"]
			const valid = requiredFields.every((field) => field in doc)

			if (!valid) {
				logger.error(
					"Invalid Swagger document structure. Missing required fields:",
					requiredFields.filter((field) => !(field in doc))
				)
				return false
			}

			// Validate OpenAPI version
			if (!doc.openapi.startsWith("3.")) {
				logger.error("Invalid OpenAPI version. Expected 3.x.x, got:", doc.openapi)
				return false
			}

			// Validate info object
			if (!doc.info.title || !doc.info.version) {
				logger.error("Invalid info object. Missing title or version")
				return false
			}

			// Validate paths
			if (typeof doc.paths !== "object") {
				logger.error("Invalid paths object")
				return false
			}

			return true
		} catch (error) {
			logger.error("Error validating Swagger document:", error)
			return false
		}
	}

	private loadYamlFile(filePath: string): any {
		try {
			logger.info("Loading YAML file:", filePath)

			if (!fs.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`)
			}

			const fileContents = fs.readFileSync(filePath, "utf8")
			const doc = yaml.load(fileContents)

			if (!doc || typeof doc !== "object") {
				throw new Error("Invalid YAML content")
			}

			logger.info("Successfully loaded YAML file:", filePath)
			return doc
		} catch (error: any) {
			logger.error(`Error loading YAML file ${filePath}:`, error)
			throw new Error(`Failed to load YAML file: ${filePath} - ${error.message}`)
		}
	}

	private mergeSwaggerDocs(docs: any[]): SwaggerDocument {
		try {
			logger.info("Merging Swagger documents...")

			if (!Array.isArray(docs) || docs.length === 0) {
				throw new Error("No valid documents to merge")
			}

			return docs.reduce((merged, doc) => {
				if (!doc || typeof doc !== "object") {
					throw new Error("Invalid document in merge")
				}

				return {
					...merged,
					...doc,
					paths: {...(merged.paths || {}), ...(doc.paths || {})},
					components: {
						...(merged.components || {}),
						...(doc.components || {}),
						schemas: {
							...(merged.components?.schemas || {}),
							...(doc.components?.schemas || {}),
						},
					},
				}
			}, {})
		} catch (error) {
			logger.error("Error merging Swagger documents:", error)
			throw error
		}
	}

	public loadDocs(): SwaggerDocument {
		try {
			if (this.swaggerDocument && this.lastLoadTime) {
				const cacheAge = Date.now() - this.lastLoadTime.getTime()
				if (cacheAge < 5000) {
					// 5 seconds cache
					return this.swaggerDocument
				}
			}

			logger.info("Loading Swagger documentation...")

			if (!fs.existsSync(this.docsPath)) {
				throw new Error(`Swagger docs directory not found: ${this.docsPath}`)
			}

			const baseYamlPath = path.join(this.docsPath, "base.yaml")
			if (!fs.existsSync(baseYamlPath)) {
				throw new Error(`Base Swagger file not found: ${baseYamlPath}`)
			}

			const baseDoc = this.loadYamlFile(baseYamlPath)
			const files = fs.readdirSync(this.docsPath).filter((file) => file.endsWith(".yaml") && file !== "base.yaml")

			logger.info("Found additional Swagger files:", files)

			const docs = [baseDoc, ...files.map((file) => this.loadYamlFile(path.join(this.docsPath, file)))]

			this.swaggerDocument = this.mergeSwaggerDocs(docs)

			if (!this.validateSwaggerDocument(this.swaggerDocument)) {
				throw new Error("Invalid Swagger documentation structure")
			}

			this.lastLoadTime = new Date()

			logger.info("Swagger documentation loaded successfully", {
				files: files.length + 1,
				endpoints: Object.keys(this.swaggerDocument.paths || {}).length,
				timestamp: this.lastLoadTime.toISOString(),
			})

			return this.swaggerDocument
		} catch (error) {
			logger.error("Failed to load Swagger documentation:", error)
			throw error
		}
	}

	public reloadDocs(): SwaggerDocument {
		this.swaggerDocument = null
		this.lastLoadTime = null
		return this.loadDocs()
	}

	public getLastLoadTime(): Date | null {
		return this.lastLoadTime
	}
}
