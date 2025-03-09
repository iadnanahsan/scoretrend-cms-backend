export class BadRequestError extends Error {
	code: string

	constructor(message: string) {
		super(message)
		this.name = "BadRequestError"
		this.code = "BAD_REQUEST"
	}
}

export class NotFoundError extends Error {
	code: string

	constructor(message: string) {
		super(message)
		this.name = "NotFoundError"
		this.code = "NOT_FOUND"
	}
}

export class UnauthorizedError extends Error {
	code: string

	constructor(message: string) {
		super(message)
		this.name = "UnauthorizedError"
		this.code = "UNAUTHORIZED"
	}
}

export class ForbiddenError extends Error {
	code: string

	constructor(message: string) {
		super(message)
		this.name = "ForbiddenError"
		this.code = "FORBIDDEN"
	}
}

export class ConflictError extends Error {
	code: string

	constructor(message: string) {
		super(message)
		this.name = "ConflictError"
		this.code = "CONFLICT"
	}
}

export class InternalServerError extends Error {
	code: string

	constructor(message: string) {
		super(message)
		this.name = "InternalServerError"
		this.code = "INTERNAL_SERVER_ERROR"
	}
}
