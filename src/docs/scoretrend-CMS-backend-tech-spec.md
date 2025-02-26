# ScoreTrend CMS Backend - Technical Specification

## Table of Contents

1. [System Overview](#system-overview)
2. [Technical Architecture](#technical-architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Language Support](#language-support)
5. [Content Management](#content-management)
6. [Blog System](#blog-system)
7. [URL Management](#url-management)
8. [SEO Implementation](#seo-implementation)
9. [Image Management](#image-management)
10. [Database Schema](#database-schema)
11. [API Endpoints](#api-endpoints)
12. [Security & Validation](#security--validation)

## System Overview

### Project Description

ScoreTrend CMS is a headless content management system designed to power a sports-focused platform. The system provides comprehensive APIs for content management, multilingual support, and blog management while maintaining SEO best practices.

#### System Architecture Overview

The CMS operates as a headless system with the following key characteristics:

-   **Centralized Admin Panel**: Enables comprehensive content management through a unified interface
-   **Role-Based Access**:
    -   **Admins**: Full system access including blogs, SEO metadata, and page content management
    -   **Authors**: Focused access for blog management, including posts and categories
-   **Content Management**:
    -   Full CRUD operations for administrators
    -   Predefined page structures (Home, About Us, Contact Us, FAQ, Policy pages)
    -   Real-time content updates
-   **Multilingual Support**:
    -   Four supported languages: English, Italian, Portuguese, and Spanish
    -   Independent content versions per language
    -   Fallback mechanisms for missing translations
-   **Media Management**:
    -   Google Cloud Storage integration
    -   Automated image processing and optimization
    -   Structured media organization
-   **Frontend Integration**:
    -   RESTful APIs for frontend developers
    -   Dynamic content delivery
    -   Instant content updates reflection
    -   Independent frontend development capability

The system architecture ensures clear separation between the CMS backend and frontend implementation, allowing for scalable and flexible content delivery while maintaining real-time synchronization between content updates and public-facing presentation.

### Core Features

-   Multi-language content management (en, it, pt, es)
-   Role-based access control (Admin/Author)
-   Blog management system
-   SEO optimization
-   Media management
-   Content versioning
-   Page-specific content management

### Technology Stack

-   Backend: Node.js with Express
-   Database: PostgreSQL
-   ORM: Prisma
-   Language: TypeScript
-   Authentication: JWT with Bcrypt
-   Documentation: Swagger
-   Storage: Google Cloud Storage
-   Validation: Zod
-   Development Tools: ESLint, Prettier

## Technical Architecture

### System Architecture

```
src/
├── config/           # Configuration settings
├── controllers/      # Request handlers
├── middleware/       # Custom middleware
├── models/          # Prisma models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
├── validators/      # Request validators
└── types/           # TypeScript types
```

### Design Patterns

-   Repository Pattern for data access
-   Service Layer for business logic
-   Strategy Pattern for language handling
-   Factory Pattern for content types
-   Observer Pattern for content updates

## Authentication & Authorization

### User Roles

1. Admin

    - Full system access
    - User management
    - Content management
    - Blog management

2. Author
    - Blog creation/management
    - Profile management
    - Comment management

### Authentication Flow

-   JWT-based authentication
-   Secure password reset mechanism
-   Email notification system
-   Session management

### Email Verification Flow

1. Registration Process:

    - User registers with email and password
    - System generates unique verification token
    - Verification email sent to user
    - Account created with email_verified=false

2. Verification Process:

    - User clicks verification link in email
    - System validates token and expiration
    - On success:
        - email_verified set to true
        - email_verified_at timestamp updated
        - verification_token cleared
    - On failure:
        - Error returned with option to resend

3. Token Management:

    - Tokens expire after 24 hours
    - Users can request new verification tokens
    - Invalid tokens are automatically cleared

4. Security Measures:
    - Unique tokens per verification attempt
    - Rate limiting on token generation
    - Secure token generation algorithm
    - Validation against timing attacks

## Language Support

### Supported Languages

```typescript
const SUPPORTED_LANGUAGES = {
	en: {name: "English", default: true},
	it: {name: "Italian"},
	pt: {name: "Portuguese"},
	es: {name: "Spanish"},
}
```

### Translation Management

-   Each content piece has versions for all languages
-   English serves as fallback
-   Independent content submission per language
-   URL aliases for each language

## Content Management

### Fixed Pages

1. Home Page

    - SEO management only
    - No content management

2. About Us Page

    - Hero section with background image
    - History section
    - Team members section
    - Our strengths with progress bars
    - Multiple sections with text/images

3. How It Works Page

    - Multiple content sections
    - Image integration
    - Technical explanations

4. Contact Us Page

    - Contact information
    - Location details
    - Contact form
    - Map integration (static)

5. FAQ Page

    - Category management
    - Question/Answer management
    - Category-based organization

6. News Page (Timeline)

    - Chronological entries
    - Image support
    - Title and description
    - Date management

7. Policy Pages (Privacy/Cookie)

    - Rich text content
    - Single section
    - No media content

8. Footer Component
    - Basic content management
    - No SEO requirements
    - Multi-language support

### Section Types

1. Standard Section

```typescript
interface StandardSection {
	title: string
	description: string
	order: number
}
```

2. Media Section

```typescript
interface MediaSection extends StandardSection {
	image: {
		url: string
		alt: string
		dimensions: {
			width: number
			height: number
		}
	}
}
```

3. Progress Bar Section

```typescript
interface ProgressSection {
	items: Array<{
		title: string
		percentage: number
		color: string
	}>
}
```

## Blog System

### Category Management

```typescript
interface BlogCategory {
	id: string
	translations: {
		[language: string]: {
			name: string
			description?: string
		}
	}
	created_at: Date
	updated_at: Date
}
```

### Blog Posts

```typescript
interface BlogPost {
	id: string
	category_id: string
	author_id: string
	translations: {
		[language: string]: {
			title: string
			content: string
			alias: string
			seo: SEOData
		}
	}
	thumbnail: string
	cover_image: string
	view_count: number
	created_at: Date
	updated_at: Date
}
```

### Comments System

```typescript
interface Comment {
	id: string
	post_id: string
	user_id: string
	content: string
	created_at: Date
}
```

## URL Management

### Structure

1. Default Language (English)

```
https://domain.com/about
https://domain.com/how-it-works
```

2. Other Languages

```
https://domain.com/it/chi-siamo
https://domain.com/es/como-funciona
```

### Alias Management

```typescript
interface PageAlias {
	page_id: string
	language: string
	alias: string
}
```

## SEO Implementation

### Meta Data Structure

```typescript
interface SEOData {
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
```

## Image Management

### Google Cloud Storage Configuration

```typescript
interface StorageConfig {
	bucket: string
	project_id: string
	credentials: {
		client_email: string
		private_key: string
	}
}
```

### Image Requirements

1. Blog Images

    - Thumbnail: 300x300px, max 500KB
    - Cover: 1200x630px, max 2MB

2. Section Images
    - Hero: 1920x1080px, max 2MB
    - Content: 800x600px, max 1MB

## Database Schema

### Core Tables

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role UserRole NOT NULL,
  status UserStatus DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  verification_token VARCHAR(255) UNIQUE,
  verification_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pages Table
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type PageType NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Page Translations
CREATE TABLE page_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id),
  language VARCHAR(2) NOT NULL,
  alias VARCHAR(255) NOT NULL,
  seo_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, language)
);

-- Sections Table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id),
  type SectionType NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Section Translations
CREATE TABLE section_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES sections(id),
  language VARCHAR(2) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(section_id, language)
);

-- Blog Categories
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Category Translations
CREATE TABLE category_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES blog_categories(id),
  language VARCHAR(2) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, language)
);

-- Blog Posts
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES blog_categories(id),
  author_id UUID REFERENCES users(id),
  status BlogStatus NOT NULL DEFAULT 'DRAFT',
  thumbnail_url VARCHAR(255),
  cover_url VARCHAR(255),
  view_count INTEGER DEFAULT 0,
  reading_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- Blog Post Translations
CREATE TABLE post_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES blog_posts(id),
  language VARCHAR(2) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  alias VARCHAR(255) NOT NULL,
  seo_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, language)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES blog_posts(id),
  user_id UUID REFERENCES users(id),
  reply_to UUID REFERENCES comments(id),
  content TEXT NOT NULL,
  status CommentStatus NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Author Details
CREATE TABLE author_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  profile_image_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE author_detail_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_detail_id UUID REFERENCES author_details(id),
  language VARCHAR(2) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  UNIQUE(author_detail_id, language)
);
```

## API Endpoints

### Authentication

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/resend-verification
```

### User Management

```
GET    /api/v1/users               // List users with filters
POST   /api/v1/users               // Create user
GET    /api/v1/users/:id           // Get user details
PUT    /api/v1/users/:id           // Update user
DELETE /api/v1/users/:id           // Delete user
PATCH  /api/v1/users/:id/status    // Toggle user status
```

### Content Management

```
// Page Content
GET    /api/v1/cms/pages/:pageType                     // Get page structure and content
GET    /api/v1/cms/pages/:pageType/translations/:lang  // Get specific language content
PUT    /api/v1/cms/pages/:pageType/translations/:lang  // Update language content

// Section Management
GET    /api/v1/cms/pages/:pageId/sections             // Get all sections
PUT    /api/v1/cms/pages/:pageId/sections/:sectionId  // Update section content

// SEO Management
GET    /api/v1/cms/pages/:pageId/seo/:lang           // Get SEO data
PUT    /api/v1/cms/pages/:pageId/seo/:lang           // Update SEO data
```

### Blog System

```
// Categories
GET    /api/v1/cms/blog/categories                    // List with pagination
POST   /api/v1/cms/blog/categories                    // Create category
PUT    /api/v1/cms/blog/categories/:id                // Update category
DELETE /api/v1/cms/blog/categories/:id                // Delete category

// Blog Posts
GET    /api/v1/cms/blogs                             // List with filters
POST   /api/v1/cms/blogs                             // Create blog
GET    /api/v1/cms/blogs/:id                         // Get blog details
PUT    /api/v1/cms/blogs/:id                         // Update blog
DELETE /api/v1/cms/blogs/:id                         // Delete blog
GET    /api/v1/cms/blogs/:id/translations/:lang      // Get translation
PUT    /api/v1/cms/blogs/:id/translations/:lang      // Update translation

// Author Management
GET    /api/v1/cms/author-profile                    // Get author profile
PUT    /api/v1/cms/author-profile                    // Update author profile
GET    /api/v1/cms/author-profile/translations/:lang // Get translation
PUT    /api/v1/cms/author-profile/translations/:lang // Update translation

// Comments
GET    /api/v1/cms/blogs/:id/comments                // List comments
POST   /api/v1/cms/blogs/:id/comments                // Add comment
PUT    /api/v1/cms/blogs/:id/comments/:commentId     // Update comment
DELETE /api/v1/cms/blogs/:id/comments/:commentId     // Delete comment
PATCH  /api/v1/cms/comments/:id/status               // Moderate comment
```

### Public API Endpoints

```
// Pages
GET    /api/v1/pages/:pageType/:lang                 // Get public page content

// Blogs
GET    /api/v1/blogs                                 // List public blogs
GET    /api/v1/blogs/:id                            // Get blog details
GET    /api/v1/blogs/categories                     // Get categories
GET    /api/v1/blogs/authors                        // Get authors list

// Comments
GET    /api/v1/blogs/:id/comments                   // Get public comments
POST   /api/v1/blogs/:id/comments                   // Post comment (auth required)
```

## Implementation Details

### Core System Architecture

The CMS operates on a predefined page structure where:

-   All pages are predefined and exist by default
-   Each page has a fixed set of sections
-   Admins can only modify content, not create/delete pages
-   Each section has specific content types and constraints

### Rich Text Editor Configuration

The CMS uses mavonEditor for rich text content management. Configuration:

```typescript
interface RichTextConfig {
	// Editor Configuration
	editable: boolean // Default: true
	language: string // Default: 'en'
	subfield: boolean // Default: false (single column mode)
	defaultOpen: "edit" // Default view mode
	toolbarsFlag: boolean // Show toolbar
	toolbars: {
		bold: true
		italic: true
		header: true
		underline: true
		strikethrough: true
		quote: true
		ol: true
		ul: true
		link: true
		imagelink: true
		code: true
		table: true
	}
}

// Section content storage
interface SectionContent {
	title: string // Plain text only
	description: string // HTML content from editor
}

// Database storage approach
interface DBContent {
	rawContent: string // Markdown content
	htmlContent: string // Rendered HTML
}
```

Key considerations:

-   Title fields use plain text input
-   Description/content fields use rich text editor
-   HTML content is sanitized before storage
-   Images from editor are processed through Google Cloud Storage
-   Editor configuration is consistent across all rich text fields

### Content Type Specifications

```typescript
// Base section content structure
interface SectionContent {
	title: string // Always plain text
	description: string // Rich text (HTML) content
	imageUrl?: string // For sections with media
}

// Example of a specialized section
interface HeroSection extends SectionContent {
	backgroundImage: string
	buttonText?: string
	buttonUrl?: string
}

// Rich text content constraints
interface RichTextConfig {
	allowedTags: string[] // Permitted HTML tags
	maxLength: number // Character limit
	allowedAttributes: string[] // Permitted HTML attributes
}
```

### TypeScript Enums & Types

```typescript
// Page Types
enum PageType {
	HOME = "HOME",
	ABOUT = "ABOUT",
	HOW_IT_WORKS = "HOW_IT_WORKS",
	CONTACT = "CONTACT",
	FAQ = "FAQ",
	NEWS = "NEWS",
	PRIVACY_POLICY = "PRIVACY_POLICY",
	COOKIE_POLICY = "COOKIE_POLICY",
}

// Section Types
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

// User Roles
enum UserRole {
	ADMIN = "ADMIN",
	AUTHOR = "AUTHOR",
}

// Language Types
enum Language {
	EN = "en",
	IT = "it",
	ES = "es",
	PT = "pt",
}
```

### Frontend Integration Examples

```typescript
// Example API Response Structure
interface PageResponse {
	alias: string
	seo: SEOData
	sections: Array<{
		type: SectionType
		content: {
			title: string
			description: string
			imageUrl?: string
			[key: string]: any
		}
	}>
}

// Example API Endpoints Usage
const endpoints = {
	// Fetch page content
	getPage: (pageType: PageType, lang: Language) => `/api/v1/pages/${pageType}/translations/${lang}`,

	// Update section content
	updateSection: (pageId: string, sectionId: string, lang: Language) =>
		`/api/v1/pages/${pageId}/sections/${sectionId}/translations/${lang}`,

	// Get blog posts with pagination
	getBlogs: (page: number, limit: number, lang: Language) => `/api/v1/blogs?page=${page}&limit=${limit}&lang=${lang}`,
}
```

### CMS API Endpoints

Essential endpoints for CMS operations:

```typescript
// Get page structure and content
GET /api/v1/cms/pages/:pageType
Response: {
  translations: {
    en: {
      alias: string;
      seo: SEOData;
      sections: Section[];
    },
    [key: string]: Translation; // Other languages
  }
}

// Update section content
PUT /api/v1/cms/pages/:pageId/sections/:sectionId
Body: {
  language: string;
  content: {
    title: string;       // Plain text only
    description: string; // HTML content
    [key: string]: any; // Additional section-specific fields
  }
}

// Manage SEO data
PUT /api/v1/cms/pages/:pageId/seo
Body: {
  language: string;
  seo: SEOData;
}
```

### Common Workflows

1. Page Content Management:

```typescript
// Fetch page content
GET /api/v1/pages/about/translations/en
Response: {
  alias: "about",
  seo: { /* SEO data */ },
  sections: [
    {
      id: "section_1",
      type: "HERO",
      content: { /* section content */ }
    }
  ]
}

// Update section content
PUT /api/v1/pages/about/sections/section_1/translations
Body: {
  language: "en",
  content: { /* updated content */ }
}
```

2. Blog Management:

```typescript
// Create blog post
POST /api/v1/blogs
Body: {
  translations: {
    en: {
      title: "English Title",
      content: "English Content",
      alias: "blog-post"
    },
    it: {
      title: "Italian Title",
      content: "Italian Content",
      alias: "post-blog"
    }
  },
  category_id: "category_uuid",
  thumbnail: "url",
  cover_image: "url"
}
```

## Security & Validation

### Input Validation

-   Joi validation schemas for all inputs
-   Sanitization of HTML content
-   File type and size validation

### Security Measures

-   JWT token validation
-   Role-based access control
-   Rate limiting (only for production)
-   CORS configuration
-   XSS protection
-   SQL injection prevention

### Error Handling

-   Standardized error responses
-   Detailed logging
-   Input validation errors
-   Authentication errors
-   Authorization errors
