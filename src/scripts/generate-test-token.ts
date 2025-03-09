import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import {UserRole} from "@prisma/client"

// Load environment variables
dotenv.config()

// Create a test token for an admin user
const payload = {
	id: "00000000-0000-0000-0000-000000000000",
	email: "admin@example.com",
	role: UserRole.ADMIN,
	name: "Test Admin",
}

const token = jwt.sign(payload, process.env.JWT_SECRET || "test-secret", {
	expiresIn: "1h",
})

console.log("TEST_AUTH_TOKEN=" + token)
