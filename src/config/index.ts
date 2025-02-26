import {config} from "dotenv"
import * as path from "path"

// Load environment variables
config()

const CONFIG = {
	// Server
	NODE_ENV: process.env.NODE_ENV || "development",
	PORT: parseInt(process.env.PORT || "3001", 10),
	HOST: process.env.HOST || "localhost:3001",
	API_VERSION: process.env.API_VERSION || "v1",

	// Database
	DB: {
		HOST: process.env.POSTGRES_HOST || "localhost",
		PORT: parseInt(process.env.POSTGRES_PORT || "5432", 10),
		NAME: process.env.POSTGRES_DB || "scoretrend_cms",
		USER: process.env.POSTGRES_USER || "scoretrend_admin",
		PASSWORD: process.env.POSTGRES_PASSWORD || "secure_password",
		URL: process.env.DATABASE_URL || "",
	},

	// JWT
	JWT: {
		SECRET: process.env.JWT_SECRET || "your_jwt_secret_key_here",
		EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
	},

	// Google Cloud Storage
	GCS: {
		PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
		BUCKET: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "",
		CREDENTIALS_PATH: path.join(
			__dirname,
			"..",
			"..",
			"config",
			"credentials",
			process.env.GOOGLE_CLOUD_CREDENTIALS_FILE || ""
		),
	},

	// CORS
	CORS: {
		ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3001",
	},

	// Rate Limiting
	RATE_LIMIT: {
		WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
		MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
	},

	// Logging
	LOG: {
		LEVEL: process.env.LOG_LEVEL || "debug",
		FILE_PATH: process.env.LOG_FILE_PATH || "logs/app.log",
	},

	// Security
	SECURITY: {
		BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
		MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10),
		ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/gif,image/webp").split(","),
	},

	// Email
	EMAIL: {
		SMTP_HOST: process.env.SMTP_HOST || "",
		SMTP_PORT: parseInt(process.env.SMTP_PORT || "465", 10),
		SMTP_USER: process.env.SMTP_USER || "",
		SMTP_PASS: process.env.SMTP_PASS || "",
		FROM_NAME: process.env.EMAIL_FROM_NAME || "ScoreTrend CMS",
		FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || "",
	},
}

// Validate required configuration
const requiredEnvVars = [
	"JWT_SECRET",
	"GOOGLE_CLOUD_PROJECT_ID",
	"GOOGLE_CLOUD_STORAGE_BUCKET",
	"GOOGLE_CLOUD_CREDENTIALS_FILE",
	"SMTP_HOST",
	"SMTP_USER",
	"SMTP_PASS",
	"EMAIL_FROM_ADDRESS",
]

for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		throw new Error(`Missing required environment variable: ${envVar}`)
	}
}

export default CONFIG
