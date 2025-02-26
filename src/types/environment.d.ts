declare global {
	namespace NodeJS {
		interface ProcessEnv {
			// Server
			NODE_ENV: "development" | "production" | "test"
			PORT: string
			API_VERSION: string

			// Database
			POSTGRES_HOST: string
			POSTGRES_PORT: string
			POSTGRES_DB: string
			POSTGRES_USER: string
			POSTGRES_PASSWORD: string
			DATABASE_URL: string

			// JWT
			JWT_SECRET: string
			JWT_EXPIRES_IN: string

			// Google Cloud Storage
			GOOGLE_CLOUD_PROJECT_ID: string
			GOOGLE_CLOUD_STORAGE_BUCKET: string
			GOOGLE_CLOUD_CREDENTIALS_FILE: string

			// CORS
			CORS_ORIGIN: string

			// Rate Limiting
			RATE_LIMIT_WINDOW_MS: string
			RATE_LIMIT_MAX_REQUESTS: string

			// Logging
			LOG_LEVEL: string
			LOG_FILE_PATH: string

			// Security
			BCRYPT_SALT_ROUNDS: string
			MAX_FILE_SIZE: string
			ALLOWED_FILE_TYPES: string

			// Email
			SMTP_HOST: string
			SMTP_PORT: string
			SMTP_USER: string
			SMTP_PASS: string
			EMAIL_FROM_NAME: string
			EMAIL_FROM_ADDRESS: string
		}
	}
}

export {}
