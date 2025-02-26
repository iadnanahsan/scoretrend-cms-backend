export interface PaginationParams {
	page: number
	limit: number
	sort?: string
	order: "asc" | "desc"
}

export interface PaginatedResponse<T> {
	data: T[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
	}
}
