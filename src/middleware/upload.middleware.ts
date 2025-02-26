import multer from "multer"
import CONFIG from "../config"
import logger from "../utils/logger"

const storage = multer.memoryStorage()

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (!CONFIG.SECURITY.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
		logger.warn("Invalid file type attempted:", {
			mimetype: file.mimetype,
			filename: file.originalname,
		})
		cb(new Error(`Invalid file type. Allowed types: ${CONFIG.SECURITY.ALLOWED_FILE_TYPES.join(", ")}`))
		return
	}
	cb(null, true)
}

const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: CONFIG.SECURITY.MAX_FILE_SIZE,
	},
})

export default upload
