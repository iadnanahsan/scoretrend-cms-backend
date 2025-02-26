# Section Types and Schemas

## 1. Base Types

```typescript
// From prisma/schema.prisma
enum SectionType {
	HERO = "HERO",
	CONTENT = "CONTENT",
	HISTORY = "HISTORY",
	TEAM = "TEAM",
	STATISTICS = "STATISTICS",
	TIMELINE = "TIMELINE",
	PROGRESS = "PROGRESS",
	SPORTS_CARD = "SPORTS_CARD",
	MISSION = "MISSION",
	GRAPH = "GRAPH",
	STANDINGS = "STANDINGS",
	LINEUP = "LINEUP",
	FAQ = "FAQ",
	CONTACT = "CONTACT",
	PRESENTATION = "PRESENTATION",
	FOOTER = "FOOTER",
}

// Base section model (from Prisma schema)
interface Section {
	id: string
	page_id: string
	type: SectionType
	order_index: number
	created_at: Date
	translations: SectionTranslation[]
}

// Base translation model
interface SectionTranslation {
	id: string
	section_id: string
	language: string
	content: Record<string, any>
	raw_content?: string
	html_content?: string
	created_at: Date
	updated_at: Date
}

// Base content interface
interface BaseSectionContent {
	title: string // Required, max 100 chars
	description: string // Required, max 5000 chars
	order: number // Required, non-negative
}
```

## 2. Implemented Section Types

### Hero Section

```typescript
interface HeroSectionContent extends BaseSectionContent {
	backgroundImage: string // Required, URL format
	buttonText?: string // Optional
	buttonUrl?: string // Optional, URL format
}
```

### Media Section

```typescript
interface MediaSectionContent extends BaseSectionContent {
	image: {
		url: string // Required, URL format
		alt: string // Required
		dimensions: {
			width: number // Required, min 1
			height: number // Required, min 1
		}
	}
}
```

### Progress Section

```typescript
interface ProgressSectionContent extends BaseSectionContent {
	items: Array<{
		title: string // Required
		percentage: number // Required, 0-100
		color: string // Required, hex format (#RRGGBB)
	}>
}
```

### Timeline Section

```typescript
interface TimelineSectionContent extends BaseSectionContent {
	items: Array<{
		date: string // Required
		title: string // Required
		description: string // Required
		image?: {
			url: string // URL format
			alt: string
		}
	}>
}
```

### FAQ Section

```typescript
interface FAQSectionContent extends BaseSectionContent {
	items: Array<{
		question: string // Required
		answer: string // Required
		category?: string // Optional
	}>
}
```

### Team Section

```typescript
interface TeamSectionContent extends BaseSectionContent {
	members: Array<{
		name: string // Required
		role: string // Required
		image: {
			url: string // Required, URL format
			alt: string // Required
		}
		description?: string
		socialLinks?: Array<{
			platform: string
			url: string // URL format
		}>
	}>
}
```

### Contact Section

```typescript
interface ContactSectionContent extends BaseSectionContent {
	address?: string
	email?: string // Valid email format
	phone?: string
	mapCoordinates?: {
		lat: number
		lng: number
	}
}
```

## 3. HTML Content Handling

The system supports HTML content with specific allowed tags:

```typescript
const ALLOWED_HTML_TAGS = [
	"p",
	"br",
	"strong",
	"em",
	"u",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"ul",
	"ol",
	"li",
	"blockquote",
	"a",
	"img",
]

const ALLOWED_ATTRIBUTES = {
	a: ["href", "target", "rel"],
	img: ["src", "alt", "width", "height"],
}
```

## 4. Validation Rules

All sections are validated using Zod schemas with the following common rules:

-   **Title:** Required, max 100 characters
-   **Description:** Required, max 5000 characters
-   **Order:** Required, non-negative integer
-   **Language:** Must be one of: 'en', 'it', 'pt', 'es'
-   **URLs:** Must be valid URL format
-   **Images:** Must include alt text and dimensions

Other section types fall back to the base section implementation.
