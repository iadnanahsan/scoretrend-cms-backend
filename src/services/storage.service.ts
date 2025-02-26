import {Storage} from "@google-cloud/storage"
import {v4 as uuidv4} from "uuid"
import path from "path"
import CONFIG from "../config"
import logger from "../utils/logger"

interface UploadOptions {
	filename: string
	buffer: Buffer
	mimeType: string
	folder?: string
}

interface DeleteOptions {
	filename: string
	folder?: string
}

class StorageService {
	private storage: Storage
	private bucket: string
	private static instance: StorageService

	private constructor() {
		this.storage = new Storage({
			keyFilename: CONFIG.GCS.CREDENTIALS_PATH,
			projectId: CONFIG.GCS.PROJECT_ID,
		})
		this.bucket = CONFIG.GCS.BUCKET
	}

	public static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService()
		}
		return StorageService.instance
	}

	private generateUniqueFilename(originalFilename: string): string {
		const ext = path.extname(originalFilename)
		const uuid = uuidv4()
		return `${uuid}${ext}`
	}

	private validateFileType(mimeType: string): boolean {
		return CONFIG.SECURITY.ALLOWED_FILE_TYPES.includes(mimeType)
	}

	private getFilePath(filename: string, folder?: string): string {
		return folder ? `${folder}/${filename}` : filename
	}

	public async uploadFile({filename, buffer, mimeType, folder}: UploadOptions): Promise<string | null> {
		try {
			if (!this.validateFileType(mimeType)) {
				logger.error("Invalid file type:", {mimeType})
				throw new Error(`Invalid file type: ${mimeType}`)
			}

			const uniqueFilename = this.generateUniqueFilename(filename)
			const filePath = this.getFilePath(uniqueFilename, folder)
			const file = this.storage.bucket(this.bucket).file(filePath)

			await file.save(buffer, {
				metadata: {
					contentType: mimeType,
				},
			})

			const publicUrl = `https://storage.googleapis.com/${this.bucket}/${filePath}`
			logger.info("File uploaded successfully:", {filePath, publicUrl})
			return publicUrl
		} catch (error) {
			logger.error("Failed to upload file:", error)
			return null
		}
	}

	public async deleteFile({filename, folder}: DeleteOptions): Promise<boolean> {
		try {
			const filePath = this.getFilePath(filename, folder)
			await this.storage.bucket(this.bucket).file(filePath).delete()

			logger.info("File deleted successfully:", {filePath})
			return true
		} catch (error) {
			logger.error("Failed to delete file:", error)
			return false
		}
	}

	public async getSignedUrl(filename: string, folder?: string): Promise<string | null> {
		try {
			const filePath = this.getFilePath(filename, folder)
			const file = this.storage.bucket(this.bucket).file(filePath)

			const [url] = await file.getSignedUrl({
				version: "v4",
				action: "read",
				expires: Date.now() + 15 * 60 * 1000, // 15 minutes
			})

			return url
		} catch (error) {
			logger.error("Failed to generate signed URL:", error)
			return null
		}
	}
}

export default StorageService.getInstance()
