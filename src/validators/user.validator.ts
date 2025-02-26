import Joi from "joi"
import {UserRole} from "../lib/prisma"

export const registerUserSchema = Joi.object({
	email: Joi.string().email().required().messages({
		"string.email": "Please provide a valid email address",
		"any.required": "Email is required",
	}),

	password: Joi.string()
		.min(8)
		.max(100)
		.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
		.required()
		.messages({
			"string.min": "Password must be at least 8 characters long",
			"string.max": "Password cannot exceed 100 characters",
			"string.pattern.base":
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			"any.required": "Password is required",
		}),

	name: Joi.string().min(2).max(100).required().messages({
		"string.min": "Name must be at least 2 characters long",
		"string.max": "Name cannot exceed 100 characters",
		"any.required": "Name is required",
	}),

	role: Joi.string()
		.valid(...Object.values(UserRole))
		.required()
		.messages({
			"any.only": "Role must be either ADMIN or AUTHOR",
			"any.required": "Role is required",
		}),
})

export const loginUserSchema = Joi.object({
	email: Joi.string().email().required().messages({
		"string.email": "Please provide a valid email address",
		"any.required": "Email is required",
	}),

	password: Joi.string().required().messages({
		"any.required": "Password is required",
	}),
})
