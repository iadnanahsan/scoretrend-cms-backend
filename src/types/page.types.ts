import {PageType, SectionType} from "@prisma/client"

// Base section content interface
export interface SectionContent {
	title: string
	description: string
	order: number
}

// Media section interface
export interface MediaSection extends SectionContent {
	image: {
		url: string
		alt: string
		dimensions: {
			width: number
			height: number
		}
	}
}

// Progress section interface
export interface ProgressSection extends SectionContent {
	items: Array<{
		title: string
		percentage: number
		color: string
	}>
}

// Hero section interface
export interface HeroSection extends SectionContent {
	backgroundImage: string
	buttonText?: string
	buttonUrl?: string
}

// SEO data interface
export interface SEOData {
	basics: {
		title: string
		description: string
		author?: string
		canonical_url?: string
	}
	openGraph: {
		title: string
		description: string
		image?: string
		type: string
	}
	twitter: {
		card: string
		title: string
		description: string
		image?: string
	}
}

// Page translation interface
export interface PageTranslation {
	id: string
	page_id: string
	language: string
	alias: string
	seo_data: SEOData
	created_at: Date
}

// Page interface
export interface Page {
	id: string
	type: PageType
	created_at: Date
	updated_at: Date
	translations: PageTranslation[]
	sections: Section[]
}

// Section interface
export interface Section {
	id: string
	page_id: string
	type: SectionType
	order_index: number
	created_at: Date
	translations: SectionTranslation[]
}

// Section translation interface
export interface SectionTranslation {
	id: string
	section_id: string
	language: string
	content: SectionContent | MediaSection | ProgressSection | HeroSection
	created_at: Date
	updated_at: Date
}

export interface SectionTranslationData {
	content: Record<string, any>
}
