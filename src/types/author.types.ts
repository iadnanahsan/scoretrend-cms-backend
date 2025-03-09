import {AuthorDetail} from "@prisma/client"

export interface AuthorTranslation {
	name: string
	description?: string
}

export interface UpdateAuthorDetailInput {
	profile_image_url?: string
	name?: string
	description?: string
	translations?: Record<string, AuthorTranslation>
}

export interface AuthorDetailWithUser extends AuthorDetail {
	user: {
		id: string
		name: string
	}
}

export interface BlogAuthor {
	id: string
	user_id: string
	name: string
	profile_image_url?: string
}
