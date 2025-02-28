import {z} from "zod"
import {SectionType} from "@prisma/client"
import logger from "../utils/logger"
import {createFieldValidationError} from "../services/error.service"

// Validation Response Types
interface ValidationErrorField {
	field: string
	message: string
}

interface ApiValidationResponse {
	error: {
		code: string
		message: string
		fields: ValidationErrorField[]
	}
}

interface ValidationError {
	field: string
	message: string
	expected?: string
	received?: any
}

interface SchemaInfo {
	required_fields: string[]
	optional_fields: string[]
	description: string
	field_descriptions: Record<string, string>
}

interface ExampleInfo {
	data: any
	explanation: string
}

interface ValidationResponse {
	isValid: boolean
	status?: string
	code?: string
	message?: string
	details?: {
		section_type: string
		errors: ValidationError[]
		schema: SchemaInfo
		example: ExampleInfo
	}
}

// Helper to transform validation error to API response
function toApiValidationError(error: ValidationResponse): ApiValidationResponse {
	return {
		error: {
			code: error.code || "VALIDATION_ERROR",
			message: error.message || "Validation failed",
			fields:
				error.details?.errors.map((err) => ({
					field: err.field,
					message: err.message,
				})) || [],
		},
	}
}

// Helper to transform detailed validation response to API response
function toApiResponse(response: ValidationResponse) {
	if (response.isValid) {
		return {isValid: true}
	}

	return {
		error: {
			code: response.code || "VALIDATION_ERROR",
			message: response.message || "Validation failed",
			fields: response.details?.errors.map((err) => ({
				field: err.field,
				message: err.message,
			})),
		},
	}
}

// Helper to get received value from error
function getReceivedValue(error: z.ZodError["errors"][0], content: any): any {
	if (error.code === "invalid_type") {
		return error.received
	}
	// For other error types, try to get the value from the content using the path
	let value = content
	for (const key of error.path) {
		if (value && typeof value === "object") {
			value = value[key]
		} else {
			return undefined
		}
	}
	return value
}

// Helper to get friendly error message
function getFriendlyErrorMessage(error: z.ZodError["errors"][0], sectionType: string): string {
	const field = error.path.join(".")

	// Section-specific messages
	const sectionMessages: Record<string, Record<string, string>> = {
		HISTORY: {
			title: "Title for the History section (e.g., 'Scoretrend History')",
			description: "Detailed explanation of ScoreTrend's history, including founders and development team",
		},
		BORN: {
			title: "Title for the BORN section explaining how ScoreTrend came to be",
			description: "Detailed explanation of ScoreTrend's origin and purpose",
		},
		FUTURE: {
			title: "Title for the future vision section",
			description: "Detailed description of ScoreTrend's future plans and integrations",
			"background_image.url": "URL for the background image (e.g., stadium or crowd image)",
			"background_image.overlay_color": "Optional hex color for overlay (e.g., #000000)",
			"background_image.overlay_opacity": "Optional opacity for overlay (0-1)",
			"link.text": "Text for the betting exchange link",
			"link.url": "URL to the betting exchange platform",
		},
		OUR_STRENGTHS: {
			title: "Title for the Our Strengths section",
			description: "Description explaining ScoreTrend's key capabilities",
			"background_image.url": "URL for the background image",
			"background_image.overlay_color": "Optional hex color for overlay (e.g., #000000)",
			"background_image.overlay_opacity": "Optional opacity for overlay (0-1)",
			strengths: "List of ScoreTrend's key capabilities with name and percentage",
			"strengths.name": "Each strength must have a name describing the capability",
			"strengths.percentage": "Percentage must be a number between 0 and 100",
			"strengths.color": "Optional hex color for the progress bar (e.g., #28a745)",
			"youtube_video.url": "URL of the YouTube video",
			"youtube_video.title": "Title of the YouTube video",
		},
		HERO: {
			title: "Main title for the hero section",
			description: "Brief description of ScoreTrend's purpose",
			"background_image.url": "URL for the large background image (e.g., stadium or sports-related)",
			"background_image.overlay_color": "Optional hex color for overlay (e.g., #000000)",
			"background_image.overlay_opacity": "Optional opacity for overlay (0-1)",
		},
		SPORTS_CARD: {
			title: "Title for the sports cards section",
			description: "Overall description for the sports section",
			cards: "Exactly 4 sport cards are required",
			"cards.icon": "Icon identifier for the sport (e.g., 'soccer', 'tennis', 'basket', 'other')",
			"cards.title": "Title of the sport card (e.g., 'Soccer', 'Tennis')",
			"cards.description": "Description of the sport's features and availability",
		},
		DISCOVER: {
			title: "Title for the discover section (e.g., 'Discover the operation of ScoreTrend on YouTube')",
			description: "Brief description for the discover section",
			"button.text": "Text for the call-to-action button (e.g., 'View YouTube Channel')",
			"button.url": "URL to the YouTube channel",
			background_color: "Optional hex color for the background (e.g., #0000FF)",
		},
		TEAM: {
			title: "Title for the team section (e.g., 'Our Team')",
			description: "Overall description of the team section",
			members: "List of team members",
			"members.image.url": "URL of the team member's profile image",
			"members.name": "Full name of the team member",
			"members.role": "Role or position in the company",
			"members.description": "Brief description of the team member's background or responsibilities",
		},
		MISSION: {
			title: "Title for the mission section",
			description: "Description explaining the mission and goals",
			"youtube_video.url": "URL of the YouTube video to display in the left column",
			"youtube_video.title": "Title of the YouTube video",
			buttons: "Exactly two call-to-action buttons are required",
			"buttons.text": "Text for the call-to-action button",
			"buttons.url": "URL for the button action",
		},
		SCORETREND_WHAT: {
			title: "Title for the 'What Is ScoreTrend?' section",
			description: "Description explaining what ScoreTrend is",
		},
		GRAPH_HOW: {
			title: "Title for the graph explanation section",
			description: "Detailed explanation of how the graph works",
		},
		GRAPH_EXAMPLE: {
			title: "Title for the graph example section",
			description: "Overall description of the graph visualization and its components",
			"image.url": "URL for the graph example image showing all possible icons and states",
			"image.alt": "Descriptive alt text for the graph example image",
			icons_explanation: "Array of icon explanations that appear in the graph",
			"icons_explanation.icon": "Icon identifier (e.g., 'goal', 'corner', 'red_card', 'substitution')",
			"icons_explanation.title": "Short title for the icon (e.g., 'Goal Scored', 'Corner Kick')",
			"icons_explanation.description": "Brief explanation of what the icon represents in the graph",
		},
		TREND_OVERVIEW: {
			title: "Title for the trends overview section",
			description: "General explanation of goal and team trends",
		},
		GOAL_TREND: {
			title: "Title for the goal trend section",
			description: "Detailed explanation of goal trend indicators and values",
		},
		TEAM_TREND: {
			title: "Title for the team trend section",
			description: "Detailed explanation of team trend indicators and values",
		},
		TABS_UNDER_GAMES: {
			title: "Title for the match tabs section",
			description: "Explanation of available match information tabs",
		},
		EVENTS: {
			title: "Title for the events section",
			description: "Overview of match events and their meanings",
		},
		STATS_LIVE: {
			title: "Title for the stats live section",
			description: "Explanation of live statistics and their meanings",
			"image.url": "URL for the stats live example image",
			"image.alt": "Descriptive alt text for the stats live image",
		},
		LINEUP: {
			title: "Title for the lineup section",
			description: "Description explaining the lineup visualization and features",
			"image.url": "URL for the lineup example image",
			"image.alt": "Descriptive alt text for the lineup image",
		},
		STANDINGS: {
			title: "Title for the standings section",
			description: "Description explaining the standings table and features",
			"image.url": "URL for the standings example image",
			"image.alt": "Descriptive alt text for the standings image",
		},
		EXPAND_EVENT: {
			title: "Title for the expand event section",
			description: "Explanation of what happens when expanding an event",
		},
		TIMELINE: {
			title: "Title for the news timeline section",
			description: "Overall description of the news timeline",
			items: "List of news entries in chronological order",
			"items.date": "Date of the news entry (e.g., '2024-03-15')",
			"items.title": "Title of the news entry (max 200 characters)",
			"items.description": "Detailed description of the news entry (max 5000 characters)",
			"items.order": "Manual ordering number (0 or greater)",
			"items.image.url": "URL for the news entry image",
			"items.image.alt": "Descriptive alt text for the image",
		},
	}

	// Get section-specific message if available
	const sectionSpecificMessage = sectionMessages[sectionType]?.[field]
	if (sectionSpecificMessage) {
		return sectionSpecificMessage
	}

	// Generic messages based on error code
	switch (error.code) {
		case "invalid_type":
			if (error.received === "undefined") {
				return `The field '${field}' is required but was not provided`
			}
			return `The field '${field}' must be a ${error.expected} but received ${error.received}`
		case "too_small":
			return `The field '${field}' is too short. Minimum length is ${error.minimum} characters`
		case "too_big":
			return `The field '${field}' is too long. Maximum length is ${error.maximum} characters`
		case "invalid_string":
			if (error.validation === "url") {
				return `The field '${field}' must be a valid URL (e.g., https://example.com)`
			}
			if (error.validation === "email") {
				return `The field '${field}' must be a valid email address`
			}
			return error.message
		default:
			return error.message
	}
}

// Helper function to create validation response
function createValidationResponse(
	schema: z.ZodType<any>,
	content: any,
	sectionType: string,
	example: any
): ValidationResponse {
	try {
		schema.parse(content)
		return {
			isValid: true,
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			const fieldErrors = error.errors.map((err) => {
				const field = err.path.join(".")
				const currentValue = getReceivedValue(err, content)

				let errorType: "MISSING" | "INVALID_FORMAT" | "INVALID_VALUE" = "INVALID_VALUE"
				if (err.code === "invalid_type" && err.received === "undefined") {
					errorType = "MISSING"
				} else if (err.code === "invalid_string" || err.code === "invalid_type") {
					errorType = "INVALID_FORMAT"
				}

				return {
					field,
					error_type: errorType,
					message: getFriendlyErrorMessage(err, sectionType as SectionType),
					expected_format: getExpectedType(err),
					example: example ? getExampleValue(example, err.path) : undefined,
					current_value: currentValue,
				}
			})

			const response = createFieldValidationError(sectionType as SectionType, fieldErrors)

			// Log detailed response for debugging
			logger.debug("Validation failed:", {
				section: sectionType,
				content,
				validation: response,
			})

			return {
				isValid: false,
				status: "error",
				code: response.code,
				message: response.message,
				details: {
					section_type: sectionType,
					errors: fieldErrors,
					schema: {
						required_fields: getRequiredFields(schema),
						optional_fields: getOptionalFields(schema),
						description: getSectionDescription(sectionType),
						field_descriptions: getFieldDescriptions(sectionType, [
							...getRequiredFields(schema),
							...getOptionalFields(schema),
						]),
					},
					example: {
						data: example,
						explanation: getExampleExplanation(sectionType),
					},
				},
			}
		}
		throw error
	}
}

// Helper to get required fields from schema
function getRequiredFields(schema: z.ZodType<any>): string[] {
	if (schema instanceof z.ZodObject) {
		return Object.entries(schema.shape)
			.filter(([_, value]) => !(value instanceof z.ZodOptional))
			.map(([key, _]) => key)
	}
	return []
}

// Helper to get optional fields from schema
function getOptionalFields(schema: z.ZodType<any>): string[] {
	if (schema instanceof z.ZodObject) {
		return Object.entries(schema.shape)
			.filter(([_, value]) => value instanceof z.ZodOptional)
			.map(([key, _]) => key)
	}
	return []
}

// Helper to get expected type from error
function getExpectedType(error: z.ZodError["errors"][0]): string {
	if (error.code === "invalid_type") {
		return error.expected
	}
	return error.message
}

// Helper to get example value for a specific path
function getExampleValue(example: any, path: (string | number)[]): any {
	let value = example
	for (const key of path) {
		if (value && typeof value === "object") {
			value = value[key]
		} else {
			return undefined
		}
	}
	return value
}

// Helper to get section description
function getSectionDescription(sectionType: string): string {
	const descriptions: Record<string, string> = {
		HISTORY:
			"The HISTORY section tells the story of ScoreTrend's development, including its conception by Gianluca Landi and development by the team led by Ion Dumitras.",
		BORN: "The BORN section explains how ScoreTrend came to be, its origin story and purpose.",
		FUTURE: "The FUTURE section presents ScoreTrend's vision for continuous improvement and integration, including machine learning capabilities and betting exchange features. It includes a background image and optional call-to-action link.",
		OUR_STRENGTHS:
			"The OUR_STRENGTHS section showcases ScoreTrend's core capabilities with a modern layout. It features a background image, title and description on the left side, progress bars showing key strengths with percentages, and a YouTube video presentation on the right side.",
		HERO: "The HERO section is the main banner of the page with a large background image, title, and description introducing ScoreTrend.",
		SPORTS_CARD:
			"The SPORTS_CARD section displays exactly 4 cards representing different sports supported by ScoreTrend. Each card includes an icon, title, and description of the sport's features.",
		DISCOVER:
			"The DISCOVER section provides a call-to-action to view ScoreTrend's YouTube channel, featuring a title, description, and a button linking to the channel.",
		TEAM: "The TEAM section showcases the key members of ScoreTrend, featuring their profile images, names, roles, and professional backgrounds.",
		SCORETREND_WHAT: "The SCORETREND_WHAT section provides an introduction to what ScoreTrend is.",
		GRAPH_HOW:
			"The GRAPH_HOW section explains how the graph works, including the histogram bars, their meaning, and interpretation.",
		GRAPH_EXAMPLE:
			"The GRAPH_EXAMPLE section provides a visual guide to understanding the icons and indicators used in the match visualization graph. It includes an example image and detailed explanations for each icon type.",
		TREND_OVERVIEW: "Understanding Goal & Team Trends",
		GOAL_TREND: "Goal Trend Explained",
		TEAM_TREND: "Team Trend Explained",
		TABS_UNDER_GAMES: "Match Information Tabs",
		EVENTS: "Match Events Guide",
		STATS_LIVE: "Live Match Statistics",
		LINEUP: "Lineup Visualization",
		STANDINGS: "Standings Table",
		description:
			"View all live match statistics including goals, shots, possession, and more. Filter by time periods to analyze team performance.",
		"image.url": "URL for the stats live example image",
		"image.alt": "Descriptive alt text for the stats live image",
	}
	return descriptions[sectionType] || "Section for content management"
}

// Helper to get field descriptions
function getFieldDescriptions(sectionType: string, fields: string[]): Record<string, string> {
	const descriptions: Record<string, Record<string, string>> = {
		HISTORY: {
			title: "Main heading for the section (max 100 characters)",
			description:
				"Detailed explanation of ScoreTrend's history, including founders and development team (max 5000 characters)",
		},
		BORN: {
			title: "Main heading for the section (max 100 characters)",
			description: "Detailed explanation of how ScoreTrend was born and its purpose (max 5000 characters)",
		},
		HERO: {
			title: "Main heading for the section (max 100 characters)",
			description: "Brief description of ScoreTrend's purpose (max 5000 characters)",
			"background_image.url": "URL for the full-width background image",
			"background_image.overlay_color": "Optional hex color code for image overlay",
			"background_image.overlay_opacity": "Optional opacity value between 0 and 1",
		},
		SCORETREND_WHAT: {
			title: "Main heading for the section (max 100 characters)",
			description: "Description explaining what ScoreTrend is",
		},
		GRAPH_EXAMPLE: {
			title: "Main heading for the section (max 100 characters)",
			description: "Overall explanation of the graph visualization (max 5000 characters)",
			"image.url": "URL for the example graph image showing all icons",
			"image.alt": "Descriptive alt text for accessibility",
			icons_explanation: "List of icon explanations with their meanings",
			"icons_explanation.icon": "Icon identifier used in the frontend",
			"icons_explanation.title": "Short, clear title for the icon",
			"icons_explanation.description": "Clear explanation of what the icon represents",
		},
		TREND_OVERVIEW: {
			title: "Main heading for the section (max 100 characters)",
			description: "General explanation of goal and team trends (max 5000 characters)",
		},
		GOAL_TREND: {
			title: "Main heading for the section (max 100 characters)",
			description: "Detailed explanation of goal trend indicators and values (max 5000 characters)",
		},
		TEAM_TREND: {
			title: "Main heading for the section (max 100 characters)",
			description: "Detailed explanation of team trend indicators and values (max 5000 characters)",
		},
		TABS_UNDER_GAMES: {
			title: "Main heading for the section (max 100 characters)",
			description: "Explanation of available match information tabs (max 5000 characters)",
		},
		EVENTS: {
			title: "Main heading for the section (max 100 characters)",
			description: "Overview of match events and their meanings (max 5000 characters)",
			"image.url": "URL for the events guide image",
			"image.alt": "Descriptive alt text for the events image",
			events_list: "List of match events with their explanations (max 5000 characters)",
			"events_list.type": "Type of event (corner, shot, goal, red_card, substitution)",
			"events_list.title": "Short title for the event",
			"events_list.description": "Brief explanation of what the event indicates",
		},
		STATS_LIVE: {
			title: "Main heading for the section (max 100 characters)",
			description: "Explanation of live statistics and their meanings (max 5000 characters)",
			"image.url": "URL for the stats live example image",
			"image.alt": "Descriptive alt text for the stats live image",
		},
		LINEUP: {
			title: "Main heading for the section (max 100 characters)",
			description: "Description explaining the lineup visualization and features (max 5000 characters)",
			"image.url": "URL for the lineup example image",
			"image.alt": "Descriptive alt text for the lineup image",
		},
		STANDINGS: {
			title: "Main heading for the section (max 100 characters)",
			description: "Description explaining the standings table and features (max 5000 characters)",
			"image.url": "URL for the standings example image",
			"image.alt": "Descriptive alt text for the standings image",
		},
	}

	const result: Record<string, string> = {}
	fields.forEach((field) => {
		result[field] = descriptions[sectionType]?.[field] || `Field ${field} for ${sectionType} section`
	})
	return result
}

// Helper to get example explanation
function getExampleExplanation(sectionType: string): string {
	const explanations: Record<string, string> = {
		HISTORY:
			"This example shows a HISTORY section with title and description explaining the history of ScoreTrend.",
		BORN: "This example shows a BORN section with title and description explaining how ScoreTrend came to be and its purpose.",
		FUTURE: "This example shows a FUTURE section with background image and betting exchange link. The section describes ScoreTrend's commitment to continuous improvement and future integrations.",
		OUR_STRENGTHS:
			"This example shows how to list strengths with their percentages. The color field is optional - if not provided, a default color will be used.",
		HERO: "This example shows a HERO section with a large background image, main title, and a brief description of ScoreTrend's purpose.",
		SPORTS_CARD: "This example shows a SPORTS_CARD section with exactly 4 sport cards.",
		SCORETREND_WHAT:
			"This example shows a SCORETREND_WHAT section with title and description explaining what ScoreTrend is.",
		GRAPH_HOW:
			"This example shows a GRAPH_HOW section with title and description explaining the graph functionality.",
		GRAPH_EXAMPLE:
			"This example shows a GRAPH_EXAMPLE section with an example image and explanations for each icon type used in the match visualization.",
		TREND_OVERVIEW: "Understanding Goal & Team Trends",
		GOAL_TREND: "Goal Trend Explained",
		TEAM_TREND: "Team Trend Explained",
		TABS_UNDER_GAMES: "Match Information Tabs",
		EVENTS: "Match Events Guide",
		STATS_LIVE: "Live Match Statistics",
		LINEUP: "Lineup Visualization",
		STANDINGS: "Standings Table",
		description:
			"View all live match statistics including goals, shots, possession, and more. Filter by time periods to analyze team performance.",
		"image.url": "URL for the stats live example image",
		"image.alt": "Descriptive alt text for the stats live image",
	}
	return explanations[sectionType] || "Example content for this section type"
}

// Type-safe section examples mapping
const sectionExamples: Partial<Record<SectionType, any>> = {
	[SectionType.HISTORY]: {
		title: "Section Title",
		description: "Brief history description explaining the key milestones and development.",
		// No additional fields required for HISTORY section
	},
	[SectionType.OUR_STRENGTHS]: {
		title: "Core Strengths",
		description: "Brief overview of our capabilities",
		background_image: {
			url: "https://example.com/images/strengths-bg.jpg",
			overlay_color: "#000000", // Optional: Hex color for overlay
			overlay_opacity: 0.5, // Optional: Value between 0-1
		},
		strengths: [
			{
				name: "Example Strength 1",
				percentage: 85,
				color: "#28a745", // Optional: Custom color for progress bar
			},
			{
				name: "Example Strength 2",
				percentage: 75, // Color will use default if not specified
			},
			// ... more strengths can be added
		],
		youtube_video: {
			url: "https://www.youtube.com/watch?v=example",
			title: "Video Title",
		},
	},
	[SectionType.FUTURE]: {
		title: "Future Vision",
		description: "Brief description of future plans",
		// All fields below are optional for FUTURE section
		background_image: {
			url: "https://example.com/images/crowd-stadium.jpg",
			overlay_color: "#000000",
			overlay_opacity: 0.7,
		},
		link: {
			text: "betting exchange",
			url: "https://example.com/betting-exchange",
		},
	},
	[SectionType.BORN]: {
		title: "Our Story",
		description: "Brief description of how the project started.",
		// No additional fields required for BORN section
	},
	[SectionType.HERO]: {
		title: "Welcome Title",
		description: "Brief welcome message or introduction",
		background_image: {
			url: "https://example.com/images/hero-bg.jpg",
			overlay_color: "#000000", // Optional: Defaults to no overlay
			overlay_opacity: 0.5, // Optional: Required if overlay_color is set
		},
	},
	[SectionType.SPORTS_CARD]: {
		title: "Sports Coverage",
		description: "Overview of supported sports",
		cards: [
			{
				icon: "sport-icon-1",
				title: "Sport Name 1",
				description: "Brief description of first sport.",
			},
			{
				icon: "sport-icon-2",
				title: "Sport Name 2",
				description: "Brief description of second sport.",
			},
			// Note: Exactly 4 cards are required in actual implementation
			// Additional cards omitted for brevity
		],
	},
	[SectionType.DISCOVER]: {
		title: "Discover More",
		description: "Optional section description", // Optional field
		button: {
			text: "Watch Now", // Required: Call-to-action text
			url: "https://youtube.com/channel/example", // Required: Must be valid URL
		},
		background_color: "#0000FF", // Optional: Hex color for section background
	},
	[SectionType.TEAM]: {
		title: "Our Team",
		description: "Meet our team members",
		members: [
			{
				image: {
					url: "https://example.com/images/team/member1.jpg",
				},
				name: "Team Member 1",
				role: "Position Title",
				description: "Brief professional background.",
			},
			{
				image: {
					url: "https://example.com/images/team/member2.jpg",
				},
				name: "Team Member 2",
				role: "Another Position",
				description: "Another brief background.",
			},
			// ... more members can be added as needed
		],
	},
	[SectionType.MISSION]: {
		title: "Mission Title",
		description: "Brief description of the mission and goals",
		youtube_video: {
			url: "https://www.youtube.com/watch?v=example",
		},
		buttons: [
			{
				text: "First Action",
				url: "https://example.com/action1",
			},
			{
				text: "Second Action",
				url: "https://example.com/action2",
			},
		],
	},
	[SectionType.SCORETREND_WHAT]: {
		title: "What Is ScoreTrend?",
		description: "Brief explanation of what ScoreTrend is and its core functionality.",
	},
	[SectionType.GRAPH_HOW]: {
		title: "Understanding the Match Graph",
		description:
			"Brief explanation of how the match visualization graph works, including what the bars represent and how to interpret them.",
	},
	[SectionType.GRAPH_EXAMPLE]: {
		title: "Graph Icons Guide",
		description: "Quick guide to understanding the icons and indicators in our match visualization",
		image: {
			url: "https://example.com/images/graph-icons-guide.webp",
			alt: "Visual guide showing graph icons and their placement",
		},
		icons_explanation: [
			{
				icon: "goal",
				title: "Goal Scored",
				description: "Marks when a goal occurs in the match",
			},
			{
				icon: "corner",
				title: "Corner Kick",
				description: "Indicates a corner kick event",
			},
			// Note: Add all relevant icons for your implementation
		],
	},
	[SectionType.TREND_OVERVIEW]: {
		title: "Understanding Goal & Team Trends",
		description: "Brief overview of how to interpret goal and team trend indicators",
	},
	[SectionType.GOAL_TREND]: {
		title: "Goal Trend Explained",
		description: "Brief explanation of goal trend values and their meaning",
	},
	[SectionType.TEAM_TREND]: {
		title: "Team Trend Explained",
		description: "Brief explanation of team trend values and their meaning",
	},
	[SectionType.TABS_UNDER_GAMES]: {
		title: "Match Information Tabs",
		description: "Overview of the information available in match tabs",
	},
	[SectionType.EVENTS]: {
		title: "Match Events Guide",
		description: "Guide to understanding match events and their indicators",
		image: {
			url: "https://example.com/images/events-guide.webp",
			alt: "Visual guide showing different match events",
		},
		events_list: [
			{
				type: "corner",
				title: "Corner Kick",
				description: "Indicates when a corner kick is awarded",
			},
			{
				type: "goal",
				title: "Goal",
				description: "Marks when a goal is scored",
			},
			// Note: Add other event types as needed
		],
	},
	[SectionType.STATS_LIVE]: {
		title: "Live Match Statistics",
		description:
			"View all live match statistics including goals, shots, possession, and more. Filter by time periods to analyze team performance.",
		image: {
			url: "https://example.com/images/stats-live-example.webp",
			alt: "Example of live match statistics panel showing various match events and metrics",
		},
	},
	[SectionType.LINEUP]: {
		title: "Lineup Visualization",
		description: "Description explaining the lineup visualization and features",
		image: {
			url: "URL for the lineup example image",
			alt: "Descriptive alt text for the lineup image",
		},
	},
	[SectionType.STANDINGS]: {
		title: "Standings Table",
		description: "Description explaining the standings table and features",
		image: {
			url: "URL for the standings example image",
			alt: "Descriptive alt text for the standings image",
		},
	},
	[SectionType.EXPAND_EVENT]: {
		title: "Expand Event",
		description:
			"Clicking on expand event opens in another window the page dedicated to the selected match. Here you will find a bigger histogram chart and all the windows on the right side of the chart. Soon in this section on the right side there will be a menu to access to all the complete statistics.",
	},
	[SectionType.TIMELINE]: {
		title: "ScoreTrend News & Updates",
		description: "Overall description of the news timeline",
		items: "List of news entries in chronological order",
		"items.date": "Date of the news entry (e.g., '2024-03-15')",
		"items.title": "Title of the news entry (max 200 characters)",
		"items.description": "Detailed description of the news entry (max 5000 characters)",
		"items.order": "Manual ordering number (0 or greater)",
		"items.image.url": "URL for the news entry image",
		"items.image.alt": "Descriptive alt text for the image",
	},
}

// Base section content schema
const baseSectionSchema = z.object({
	title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
	description: z.string().min(1, "Description is required").max(5000, "Description cannot exceed 5000 characters"),
})

// Media section schema
const mediaSectionSchema = baseSectionSchema.extend({
	image: z.object({
		url: z.string().url("Invalid image URL"),
		alt: z.string().min(1, "Alt text is required"),
		dimensions: z.object({
			width: z.number().int().min(1, "Width must be a positive number"),
			height: z.number().int().min(1, "Height must be a positive number"),
		}),
	}),
})

// Progress section schema
const progressSectionSchema = baseSectionSchema.extend({
	items: z.array(
		z.object({
			title: z.string().min(1, "Item title is required"),
			percentage: z.number().min(0, "Percentage must be between 0 and 100").max(100),
			color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
		})
	),
})

// Hero section schema
const heroSectionSchema = baseSectionSchema.extend({
	background_image: z.object({
		url: z.string().url("Background image URL is required and must be a valid URL"),
		overlay_color: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid overlay color format")
			.optional(),
		overlay_opacity: z.number().min(0).max(1).optional(),
	}),
})

// Timeline section schema
const timelineSectionSchema = z.object({
	items: z
		.array(
			z.object({
				date: z.string().min(1, "Date is required"),
				description: z
					.string()
					.min(1, "Description is required")
					.max(5000, "Description cannot exceed 5000 characters"),
				order: z.number().int().min(0, "Order must be a non-negative number"),
				image: z
					.object({
						url: z.string().url("Image URL must be a valid URL"),
						alt: z.string().min(1, "Alt text is required"),
					})
					.optional(),
			})
		)
		.min(1, "At least one timeline item is required"),
})

// FAQ section schema
const faqSectionSchema = z.object({
	items: z
		.array(
			z.object({
				question: z.string().min(1, "Question is required"),
				answer: z.string().min(1, "Answer is required"),
			})
		)
		.min(1, "At least one FAQ item is required"),
})

// Team section schema
const teamSectionSchema = z.object({
	members: z
		.array(
			z.object({
				image: z.object({
					url: z.string().url("Profile image URL is required"),
					alt: z.string().min(1, "Alt text is required"),
				}),
				name: z.string().min(1, "Team member name is required").max(100, "Name cannot exceed 100 characters"),
				role: z.string().min(1, "Team member role is required").max(100, "Role cannot exceed 100 characters"),
				description: z
					.string()
					.min(1, "Team member description is required")
					.max(500, "Description cannot exceed 500 characters"),
			})
		)
		.length(4, "Exactly 4 team members are required"),
})

// Contact section schema
const contactSectionSchema = baseSectionSchema.extend({
	address: z.string().optional(),
	email: z.string().email("Invalid email address").optional(),
	phone: z.string().optional(),
	mapCoordinates: z
		.object({
			lat: z.number(),
			lng: z.number(),
		})
		.optional(),
})

// Our Strengths section schema
const ourStrengthsSchema = baseSectionSchema.extend({
	background_image: z.object({
		url: z.string().url("Background image URL is required and must be a valid URL"),
		overlay_color: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid overlay color format")
			.optional(),
		overlay_opacity: z.number().min(0).max(1).optional(),
	}),
	strengths: z.array(
		z.object({
			name: z.string().min(1, "Strength name is required"),
			percentage: z.number().min(0, "Percentage must be between 0 and 100").max(100),
			color: z
				.string()
				.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
				.optional(),
		})
	),
	youtube_video: z.object({
		url: z.string().url("YouTube video URL is required"),
		title: z.string().min(1, "Video title is required"),
	}),
})

// Born section schema
const bornSectionSchema = baseSectionSchema.extend({
	// No additional fields required
})

// Future section schema
const futureSectionSchema = z.object({
	description: z.string().min(1, "Description is required").max(5000, "Description cannot exceed 5000 characters"),
	background_image: z.object({
		url: z.string().url("Invalid background image URL"),
	}),
	link: z
		.object({
			text: z.string().min(1, "Link text is required"),
			url: z.string().url("Invalid URL"),
		})
		.optional(),
})

// History section schema
const historySchema = baseSectionSchema.extend({
	// No additional fields required
})

// Sports Card section schema
const sportsCardSchema = z.object({
	cards: z
		.array(
			z.object({
				icon: z.string().min(1, "Sport icon is required"),
				title: z.string().min(1, "Sport title is required").max(50, "Sport title cannot exceed 50 characters"),
				description: z
					.string()
					.min(1, "Sport description is required")
					.max(500, "Sport description cannot exceed 500 characters"),
			})
		)
		.length(4, "Exactly 4 sport cards are required"),
})

// Discover section schema
const discoverSchema = z.object({
	title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
	button: z.object({
		text: z.string().min(1, "Button text is required"),
		url: z.string().url("Button URL must be a valid YouTube channel URL"),
	}),
	background_color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
		.optional(),
})

// Mission section schema
const missionSectionSchema = baseSectionSchema.extend({
	youtube_video: z.object({
		url: z.string().url("YouTube video URL is required"),
	}),
	buttons: z
		.array(
			z.object({
				text: z.string().min(1, "Button text is required"),
				url: z.string().url("Button URL is required"),
			})
		)
		.length(2, "Exactly two buttons are required"),
})

// ScoreTrend What section schema
const scoreWhatSchema = baseSectionSchema.extend({
	image: z.object({
		url: z.string().url("Invalid image URL"),
		alt: z.string().min(1, "Alt text is required"),
		dimensions: z.object({
			width: z.number().int().min(1, "Width must be a positive number"),
			height: z.number().int().min(1, "Height must be a positive number"),
		}),
	}),
})

// Add new schema for graph example section
const graphExampleSchema = baseSectionSchema.extend({
	image: z.object({
		url: z.string().url("Graph example image URL must be a valid URL"),
		alt: z.string().min(1, "Alt text for graph example image is required"),
	}),
	icons_explanation: z
		.array(
			z.object({
				icon: z.string().min(1, "Icon identifier is required"),
				title: z.string().min(1, "Icon title is required").max(100, "Icon title cannot exceed 100 characters"),
				description: z
					.string()
					.min(1, "Icon description is required")
					.max(250, "Icon description cannot exceed 250 characters"),
				// Optional icon image URL - should be a small PNG uploaded using section_content media type
				icon_url: z.string().url("Icon image URL must be a valid URL").optional(),
			})
		)
		.min(1, "At least one icon explanation is required"),
})

// Add new schemas for trend sections and events
const trendOverviewSchema = baseSectionSchema.extend({
	// Just title and description for overview of both trends
})

const goalTrendSchema = baseSectionSchema.extend({
	// Just title and description explaining goal trend specifics
})

const teamTrendSchema = baseSectionSchema.extend({
	// Just title and description explaining team trend specifics
})

const tabsUnderGamesSchema = baseSectionSchema.extend({
	// Just title and description explaining the tabs functionality
})

const eventsSchema = baseSectionSchema.extend({
	// No additional fields required beyond title and description
})

// Add new schema for stats live section
const statsLiveSchema = baseSectionSchema.extend({
	image: z.object({
		url: z.string().url("Stats Live image URL must be a valid URL"),
		alt: z.string().min(1, "Alt text for stats live image is required"),
	}),
})

// Add new schema for expand event section
const expandEventSchema = baseSectionSchema.extend({
	// Just title and description for expand event explanation
})

const lineupSchema = baseSectionSchema.extend({
	title: z.string().min(1).max(100),
	description: z.string().min(1).max(5000),
	image: z.object({
		url: z.string().url(),
		alt: z.string().min(1).max(200),
	}),
})

const standingsSchema = baseSectionSchema.extend({
	title: z.string().min(1).max(100),
	description: z.string().min(1).max(5000),
	image: z.object({
		url: z.string().url(),
		alt: z.string().min(1).max(200),
	}),
})

// Footer section schema
const footerSchema = baseSectionSchema.extend({
	social_links: z.array(
		z.object({
			platform: z.enum(["facebook", "youtube", "instagram", "twitter", "linkedin"]),
			url: z.string().url("Invalid social media URL"),
		})
	),
	copyright: z.string().min(1, "Copyright text is required"),
})

// Enhanced section content validator
export const validateSectionContent = (type: SectionType, content: any): ValidationResponse | never => {
	try {
		let schema: z.ZodType<any>
		let example: any = sectionExamples[type] || undefined

		switch (type) {
			case SectionType.HISTORY:
				schema = historySchema
				break
			case SectionType.OUR_STRENGTHS:
				schema = ourStrengthsSchema
				break
			case SectionType.FUTURE:
				schema = futureSectionSchema
				break
			case SectionType.BORN:
				schema = bornSectionSchema
				break
			case SectionType.HERO:
				schema = heroSectionSchema
				break
			case SectionType.CONTENT:
				schema = mediaSectionSchema
				break
			case SectionType.TIMELINE:
				schema = timelineSectionSchema
				break
			case SectionType.FAQ:
				schema = faqSectionSchema
				break
			case SectionType.TEAM:
				schema = teamSectionSchema
				break
			case SectionType.CONTACT:
				schema = contactSectionSchema
				break
			case SectionType.SPORTS_CARD:
				schema = sportsCardSchema
				break
			case SectionType.DISCOVER:
				schema = discoverSchema
				break
			case SectionType.MISSION:
				schema = missionSectionSchema
				break
			case SectionType.SCORETREND_WHAT:
				schema = baseSectionSchema
				break
			case SectionType.GRAPH_HOW:
				schema = baseSectionSchema
				break
			case SectionType.GRAPH_EXAMPLE:
				schema = graphExampleSchema
				break
			case SectionType.TREND_OVERVIEW:
				schema = trendOverviewSchema
				break
			case SectionType.GOAL_TREND:
				schema = goalTrendSchema
				break
			case SectionType.TEAM_TREND:
				schema = teamTrendSchema
				break
			case SectionType.TABS_UNDER_GAMES:
				schema = tabsUnderGamesSchema
				break
			case SectionType.EVENTS:
				schema = eventsSchema
				break
			case SectionType.STATS_LIVE:
				schema = statsLiveSchema
				break
			case SectionType.LINEUP:
				schema = lineupSchema
				break
			case SectionType.STANDINGS:
				schema = standingsSchema
				break
			case SectionType.EXPAND_EVENT:
				schema = expandEventSchema
				break
			case SectionType.FOOTER:
				schema = footerSchema
				break
			default:
				schema = baseSectionSchema
		}

		const response = createValidationResponse(schema, content, type.toString(), example)

		if (!response.isValid) {
			// Transform to API-friendly error
			const apiError = toApiValidationError(response)
			throw new Error(JSON.stringify(apiError))
		}

		return response
	} catch (error) {
		if (error instanceof z.ZodError) {
			const response = createValidationResponse(baseSectionSchema, content, type.toString(), undefined)
			const apiError = toApiValidationError(response)
			throw new Error(JSON.stringify(apiError))
		}
		throw error
	}
}

// Section content type guard
export const isSectionContent = (type: SectionType, content: any): boolean => {
	try {
		validateSectionContent(type, content)
		return true
	} catch {
		return false
	}
}

// Section content type definitions
export type BaseSectionContent = z.infer<typeof baseSectionSchema>
export type MediaSectionContent = z.infer<typeof mediaSectionSchema>
export type HeroSectionContent = z.infer<typeof heroSectionSchema>
export type TimelineSectionContent = z.infer<typeof timelineSectionSchema>
export type FAQSectionContent = z.infer<typeof faqSectionSchema>
export type TeamSectionContent = z.infer<typeof teamSectionSchema>
export type ContactSectionContent = z.infer<typeof contactSectionSchema>
export type OurStrengthsContent = z.infer<typeof ourStrengthsSchema>
export type BornSectionContent = z.infer<typeof bornSectionSchema>
export type FutureSectionContent = z.infer<typeof futureSectionSchema>

// Union type for all section content types
export type SectionContent =
	| BaseSectionContent
	| MediaSectionContent
	| HeroSectionContent
	| TimelineSectionContent
	| FAQSectionContent
	| TeamSectionContent
	| ContactSectionContent
	| OurStrengthsContent
	| BornSectionContent
	| FutureSectionContent
