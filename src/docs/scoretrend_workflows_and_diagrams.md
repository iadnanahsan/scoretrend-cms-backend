# Scoretrend Workflows and Diagrams

## Section Management Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as API Endpoints
    participant DB as Database
    participant Media as Media Storage

    FE->>API: GET /api/v1/cms/pages/{pageType}?language={lang}
    API->>DB: Fetch Page & Sections
    DB-->>API: Return Data
    API-->>FE: Page with Sections

    Note over FE,API: Creating New Section
    FE->>API: POST /api/v1/cms/pages/{pageId}/sections
    API->>DB: Create Section
    DB-->>API: Return New Section
    API-->>FE: Section Created

    Note over FE,API: Updating Section Content
    FE->>API: PUT /api/v1/cms/pages/{pageId}/sections/{sectionId}
    API->>DB: Update Section Translation
    DB-->>API: Return Updated Section
    API-->>FE: Section Updated

    Note over FE,Media: Media Upload Flow
    FE->>API: POST /api/v1/cms/media/upload
    API->>Media: Process & Store Media
    Media-->>API: Return Media URL
    API-->>FE: Media URL for Section
```

## High-Level System Overview

```mermaid
graph TB
    subgraph "CMS Admin Panel"
        A[Admin/Author Login] --> B[Page Management]
        B --> C[Fixed Pages]
        B --> D[Section Management]
        D --> E[Section Types]
        D --> F[Media Management]
    end
    subgraph "Fixed Pages"
        C --> HOME[Home]
        C --> ABOUT[About]
        C --> HIW[How It Works]
        C --> CONTACT[Contact]
        C --> FAQ[FAQ]
        C --> NEWS[News]
        C --> PRIVACY[Privacy Policy]
        C --> COOKIE[Cookie Policy]
    end
    subgraph "Section Types"
        E --> HERO[Hero]
        E --> CONTENT[Content]
        E --> HISTORY[History]
        E --> TEAM[Team]
        E --> STATS[Statistics]
        E --> TIMELINE[Timeline]
        E --> PROGRESS[Progress]
        E --> SPORTS[Sports Card]
        E --> MISSION[Mission]
        E --> GRAPH[Graph]
        E --> STANDINGS[Standings]
        E --> LINEUP[Lineup]
        E --> FAQ_SEC[FAQ]
        E --> CONTACT_SEC[Contact]
        E --> PRESENT[Presentation]
        E --> FOOTER[Footer]
    end
    subgraph "Public Site"
        P[Public Pages] --> PL[Language Selection]
        PL --> PC[Page Content]
        PC --> PS[Section Display]
    end
    B -.-> P
    D -.-> PS
```

## Contact Section Implementation

```mermaid
graph TD
    subgraph ContactSectionImplementation["Contact Section Implementation"]
        A[Create Contact Section] --> B{Validate Content}
        B -->|Valid| C[Process Content]
        B -->|Invalid| ERR[Return Error: Invalid Input]
        C --> D[Basic Content]
        C --> E[Form Config]
        C --> F[Map Integration]

        D --> G[Store Translation]
        E --> G
        F --> G

        G --> H[Update Section]

        subgraph ContentTypes["Content Types"]
            D1[Title]
            D2[Description]
            D3[Contact Info]
            D4[Address]
        end

        subgraph FormConfiguration["Form Configuration"]
            E1[Field Definitions]
            E2[Validation Rules]
            E3[Success Messages]
            E4[Error Messages]
        end

        subgraph MapData["Map Data"]
            F1[Coordinates: lat, lng]
            F2[Zoom Level]
            F3[Markers]
        end
    end
    ERR -.-> A
```

## Multilingual Content Management

```mermaid
graph LR
    subgraph "Language Management"
        A[Section Content] --> B{Language Selection}
        B --> C[English]
        B --> D[Italian]
        B --> E[Portuguese]
        B --> F[Spanish]

        C --> G[Content Store]
        D --> G
        E --> G
        F --> G

        G --> H[Database]

        subgraph "Translation Process"
            I[Create/Update Content] --> J[Select Language]
            J --> K[Edit Content]
            K --> L[Validate]
            L --> M[Save Translation]
        end
    end
```

## SEO and Media Integration

```mermaid
graph TB
    subgraph "SEO Management"
        A[Page SEO] --> B[Basic Meta]
        A --> C[OpenGraph]
        A --> D[Twitter Cards]

        B --> E[Store SEO Data]
        C --> E
        D --> E
    end

    subgraph "Media Management"
        F[Upload Media] --> G{Validate}
        G -->|Valid| H[Process Image]
        G -->|Invalid| F

        H --> I[Optimize]
        I --> J[Store]
        J --> K[Return URL]

        subgraph "Image Types"
            L[Blog Thumbnail]
            M[Blog Cover]
            N[Section Hero]
            O[Section Content]
            P[Author Profile]
        end
    end
```

## Section Update Flow

```mermaid
stateDiagram-v2
    [*] --> EditSection
    EditSection --> ValidateContent
    ValidateContent --> ProcessMedia
    ProcessMedia --> UpdateTranslations
    UpdateTranslations --> NotifyObservers
    NotifyObservers --> [*]

    state ValidateContent {
        [*] --> CheckSchema
        CheckSchema --> ValidateFields
        ValidateFields --> [*]
    }

    state ProcessMedia {
        [*] --> UploadFiles
        UploadFiles --> OptimizeImages
        OptimizeImages --> StoreURLs
        StoreURLs --> [*]
    }

    state UpdateTranslations {
        [*] --> SaveContent
        SaveContent --> UpdateMetadata
        UpdateMetadata --> [*]
    }
```

## Blog and Section Creation Flow

```mermaid
sequenceDiagram
    participant Admin
    participant MediaEndpoint
    participant GCS as Google Cloud Storage
    participant Database
    Note over Admin,Database: Blog Post Creation Flow
    Admin->>MediaEndpoint: 1. Upload thumbnail (POST /media/upload)
    MediaEndpoint->>GCS: 2. Process & store image
    GCS-->>MediaEndpoint: 3. Return public URL
    MediaEndpoint-->>Admin: 4. Return URL & metadata
    Admin->>Database: 5. Create blog post with thumbnail_url
    Database-->>Admin: 6. Return created blog post
    Note over Admin,Database: Section Creation Flow
    Admin->>MediaEndpoint: 7. Upload section image
    MediaEndpoint->>GCS: 8. Process & store image
    GCS-->>MediaEndpoint: 9. Return public URL
    MediaEndpoint-->>Admin: 10. Return URL & metadata
    Admin->>Database: 11. Create section with image URL in content
    Database-->>Admin: 12. Return created section
```

## Media Delete Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Storage

    Admin->>Frontend: Clicks delete button
    Frontend->>Admin: Shows confirmation dialog
    Admin->>Frontend: Confirms deletion
    Frontend->>Backend: DELETE /api/v1/cms/media/delete?url=encoded_url
    Backend->>Backend: Validates admin permissions
    Backend->>Backend: Validates and decodes URL
    Backend->>Storage: Deletes file
    Storage->>Backend: Confirms deletion
    Backend->>Frontend: Returns success response
    Frontend->>Admin: Shows success message
    Frontend->>Frontend: Updates UI (removes thumbnail)               