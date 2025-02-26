import jwt from "jsonwebtoken"
import {UserRole} from "../lib/prisma"
import logger from "./logger"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const TOKEN_EXPIRY = "24h"

interface TokenPayload {
	userId: string
	email: string
	role: UserRole
}

class JWTUtil {
	static generateTokens(payload: TokenPayload): string {
		try {
			return jwt.sign(payload, JWT_SECRET, {
				expiresIn: TOKEN_EXPIRY,
			})
		} catch (error) {
			logger.error("Error generating JWT token:", error)
			throw new Error("Failed to generate authentication token")
		}
	}

	static verifyToken(token: string): TokenPayload {
		try {
			return jwt.verify(token, JWT_SECRET) as TokenPayload
		} catch (error) {
			logger.error("Error verifying JWT token:", error)
			throw new Error("Invalid or expired token")
		}
	}

	static decodeToken(token: string): TokenPayload | null {
		try {
			return jwt.decode(token) as TokenPayload
		} catch (error) {
			logger.error("Error decoding JWT token:", error)
			return null
		}
	}
}

export default JWTUtil
