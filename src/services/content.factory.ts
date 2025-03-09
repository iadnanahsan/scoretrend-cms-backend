import {SectionType} from "@prisma/client"

// Base Content Interface
interface ContentSection {
	title?: string
	description?: string
	// Optional properties for different section types
	background_image?: {
		url: string
		overlay_color?: string
		overlay_opacity?: number
	}
	strengths?: Array<{
		name: string
		percentage: number
		color?: string
	}>
	events?: Array<{
		date: string
		title: string
		description: string
		order: number
		image?: {
			url: string
			alt: string
		}
	}>
	link?: {
		text: string
		url: string
	}
	youtube_video?: {
		url: string
	}
	image?: {
		url: string
		alt: string
		dimensions?: {
			width: number
			height: number
		}
	}
	items?: Array<
		| {
				title: string
				percentage: number
				color: string
		  }
		| {
				question: string
				answer: string
				category?: string
		  }
	>
	members?: Array<{
		name: string
		role: string
		image: {
			url: string
			alt: string
		}
		description: string
	}>
	cards?: Array<{
		icon: string
		title: string
		description: string
	}>
	button?: {
		text: string
		url: string
	}
	buttons?: Array<{
		text: string
		url: string
	}>
	icons_explanation?: Array<{
		icon: string
		title: string
		description: string
		icon_url?: string
	}>
	events_list?: Array<{
		type: "corner" | "shot" | "goal" | "red_card" | "substitution"
		title: string
		description: string
	}>
	// Contact section fields
	address?: string
	email?: string
	phone?: string
	mapCoordinates?: {
		lat: number
		lng: number
	}
	// Footer section fields
	social_links?: Array<{
		platform: string
		url: string
	}>
	copyright?: string
}

// Specialized Content Types
interface HeroSection extends ContentSection {
	backgroundImage: string
	buttonText?: string
	buttonUrl?: string
}

interface MediaSection extends ContentSection {
	image: {
		url: string
		alt: string
		dimensions: {
			width: number
			height: number
		}
	}
}

// Content Factory
export class ContentFactory {
	public static createSection(type: SectionType, data: any): ContentSection {
		switch (type) {
			case SectionType.HERO:
				return this.createHeroSection(data)
			case SectionType.CONTENT:
				return this.createMediaSection(data)
			case SectionType.OUR_STRENGTHS:
				return this.createOurStrengthsSection(data)
			case SectionType.BORN:
				return this.createBornSection(data)
			case SectionType.FUTURE:
				return this.createFutureSection(data)
			case SectionType.TIMELINE:
				return this.createTimelineSection(data)
			case SectionType.TEAM:
				return this.createTeamSection(data)
			case SectionType.SPORTS_CARD:
				return this.createSportsCardSection(data)
			case SectionType.DISCOVER:
				return this.createDiscoverSection(data)
			case SectionType.MISSION:
				return this.createMissionSection(data)
			case SectionType.GRAPH_EXAMPLE:
				return this.createGraphExampleSection(data)
			case SectionType.EVENTS:
				return this.createEventsSection(data)
			case SectionType.STATS_LIVE:
				return this.createStatsLiveSection(data)
			case SectionType.LINEUP:
				return this.createLineupSection(data)
			case SectionType.STANDINGS:
				return this.createStandingsSection(data)
			case SectionType.HISTORY:
				return this.createHistorySection(data)
			case SectionType.SCORETREND_WHAT:
				return this.createScoreTrendWhatSection(data)
			case SectionType.GRAPH_HOW:
				return this.createGraphHowSection(data)
			case SectionType.TREND_OVERVIEW:
				return this.createTrendOverviewSection(data)
			case SectionType.GOAL_TREND:
				return this.createGoalTrendSection(data)
			case SectionType.TEAM_TREND:
				return this.createTeamTrendSection(data)
			case SectionType.TABS_UNDER_GAMES:
				return this.createTabsUnderGamesSection(data)
			case SectionType.EXPAND_EVENT:
				return this.createExpandEventSection(data)
			case SectionType.FAQ:
				return this.createFAQSection(data)
			case SectionType.CONTACT:
				return this.createContactSection(data)
			case SectionType.FOOTER:
				return this.createFooterSection(data)
			default:
				return this.createDefaultSection(data)
		}
	}

	private static createHeroSection(data: any): HeroSection {
		return {
			title: data.title,
			description: data.description,
			backgroundImage: data.backgroundImage,
			buttonText: data.buttonText,
			buttonUrl: data.buttonUrl,
			background_image: data.background_image
				? {
						url: data.background_image.url,
						overlay_color: data.background_image.overlay_color,
						overlay_opacity: data.background_image.overlay_opacity,
				  }
				: undefined,
		}
	}

	private static createMediaSection(data: any): MediaSection {
		return {
			title: data.title,
			description: data.description,
			image: {
				url: data.image.url,
				alt: data.image.alt,
				dimensions: {
					width: data.image.dimensions.width,
					height: data.image.dimensions.height,
				},
			},
		}
	}

	private static createTimelineSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			events: data.items?.map((item: any) => ({
				title: item.title,
				description: item.description,
				date: item.date,
				order: item.order,
				image: item.image
					? {
							url: item.image.url,
							alt: item.image.alt,
					  }
					: undefined,
			})),
		}
	}

	private static createTeamSection(data: any): ContentSection {
		return {
			members: data.members?.map((member: any) => ({
				name: member.name,
				role: member.role,
				description: member.description,
				image: {
					url: member.image.url,
					alt: member.name, // Using member's name as alt text
				},
			})),
		}
	}

	private static createDefaultSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createOurStrengthsSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			strengths: data.strengths?.map((strength: any) => ({
				name: strength.name,
				percentage: strength.percentage,
				color: strength.color,
			})),
			background_image: data.background_image
				? {
						url: data.background_image.url,
						overlay_color: data.background_image.overlay_color,
						overlay_opacity: data.background_image.overlay_opacity,
				  }
				: undefined,
			youtube_video: data.youtube_video
				? {
						url: data.youtube_video.url,
				  }
				: undefined,
		}
	}

	private static createBornSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createFutureSection(data: any): ContentSection {
		return {
			description: data.description,
			background_image: data.background_image
				? {
						url: data.background_image.url,
				  }
				: undefined,
			link: data.link
				? {
						text: data.link.text,
						url: data.link.url,
				  }
				: undefined,
		}
	}

	private static createSportsCardSection(data: any): ContentSection {
		return {
			cards: data.cards?.map((card: any) => ({
				icon: card.icon,
				title: card.title,
				description: card.description,
			})),
		}
	}

	private static createDiscoverSection(data: any): ContentSection {
		return {
			title: data.title,
			button: {
				text: data.button.text,
				url: data.button.url,
			},
		}
	}

	private static createMissionSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			youtube_video: {
				url: data.youtube_video.url,
			},
			buttons: data.buttons?.map((button: any) => ({
				text: button.text,
				url: button.url,
			})),
		}
	}

	private static createGraphExampleSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			image: {
				url: data.image.url,
				alt: data.image.alt,
			},
			icons_explanation: data.icons_explanation?.map((icon: any) => ({
				icon: icon.icon,
				title: icon.title,
				description: icon.description,
				icon_url: icon.icon_url,
			})),
		}
	}

	private static createEventsSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createStatsLiveSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			image: {
				url: data.image.url,
				alt: data.image.alt,
			},
		}
	}

	private static createLineupSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			image: {
				url: data.image.url,
				alt: data.image.alt,
			},
		}
	}

	private static createStandingsSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			image: {
				url: data.image.url,
				alt: data.image.alt,
			},
		}
	}

	private static createHistorySection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createScoreTrendWhatSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			image: data.image
				? {
						url: data.image.url,
						alt: data.image.alt,
						dimensions: {
							width: data.image.dimensions.width,
							height: data.image.dimensions.height,
						},
				  }
				: undefined,
		}
	}

	private static createGraphHowSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createTrendOverviewSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createGoalTrendSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createTeamTrendSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createTabsUnderGamesSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createExpandEventSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
		}
	}

	private static createFAQSection(data: any): ContentSection {
		return {
			items: data.items?.map((item: any) => ({
				question: item.question,
				answer: item.answer,
			})),
		}
	}

	private static createContactSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			address: data.address,
			email: data.email,
			phone: data.phone,
			mapCoordinates: data.mapCoordinates
				? {
						lat: data.mapCoordinates.lat,
						lng: data.mapCoordinates.lng,
				  }
				: undefined,
			social_links: data.social_links?.map((link: any) => ({
				platform: link.platform,
				url: link.url,
			})),
		}
	}

	private static createFooterSection(data: any): ContentSection {
		return {
			title: data.title,
			description: data.description,
			social_links: data.social_links?.map((link: any) => ({
				platform: link.platform,
				url: link.url,
			})),
			copyright: data.copyright,
		}
	}
}
