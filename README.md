# ScoreTrend CMS Backend

A headless content management system designed to power a sports-focused platform with comprehensive APIs for content management, multilingual support, and blog management while maintaining SEO best practices.

## System Overview

ScoreTrend CMS operates as a headless system with the following key features:

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

## Technology Stack

-   **Backend**: Node.js with Express.js
-   **Database**: PostgreSQL with Prisma ORM
-   **Authentication**: JWT-based authentication
-   **Documentation**: Swagger/OpenAPI
-   **Storage**: Google Cloud Storage for media files
-   **Validation**: Zod for schema validation
-   **Security**: Helmet, CORS, rate limiting, and input sanitization

## Prerequisites

-   Node.js (v18.0.0 or higher)
-   PostgreSQL (v14 or higher)
-   Google Cloud Storage account (for media storage)
-   SMTP server (for email functionality)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/iadnanahsan/scoretrend-cms-backend.git
    cd scoretrend-cms-backend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory with the following variables:

    ```
    # Server Configuration
    NODE_ENV=development
    PORT=3001
    API_VERSION=v1

    # Database Configuration
    POSTGRES_HOST=localhost
    POSTGRES_PORT=5432
    POSTGRES_DB=scoretrend_cms
    POSTGRES_USER=your_postgres_user
    POSTGRES_PASSWORD=your_postgres_password
    DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

    # JWT Configuration
    JWT_SECRET=your_jwt_secret
    JWT_EXPIRES_IN=24h

    # Google Cloud Storage
    GOOGLE_CLOUD_PROJECT_ID=your_project_id
    GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
    GOOGLE_CLOUD_CREDENTIALS_FILE=your_credentials_file.json

    # CORS Configuration
    CORS_ORIGIN=http://localhost:3000

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS=900000
    RATE_LIMIT_MAX_REQUESTS=100

    # Logging
    LOG_LEVEL=debug
    LOG_FILE_PATH=logs/app.log

    # Security
    BCRYPT_SALT_ROUNDS=12
    MAX_FILE_SIZE=5242880 # 5MB in bytes
    ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

    # Email Configuration
    SMTP_HOST=your_smtp_host
    SMTP_PORT=465
    SMTP_USER=your_smtp_user
    SMTP_PASS=your_smtp_password
    EMAIL_FROM_NAME=Scoretrend CMS
    EMAIL_FROM_ADDRESS=your_email_address
    ```

4. Set up Google Cloud Storage:

    - Create a service account in Google Cloud Console
    - Download the credentials JSON file
    - Place it in the `src/config/credentials/` directory
    - Update the `GOOGLE_CLOUD_CREDENTIALS_FILE` in your `.env` file

5. Set up the database:

    ```bash
    # Generate Prisma client
    npm run prisma:generate

    # Run database migrations
    npm run prisma:migrate

    # Seed the database with initial data (optional)
    npx prisma db seed
    ```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start the application
npm start
```

## API Documentation

Once the application is running, you can access the Swagger API documentation at:

```
http://localhost:3001/api-docs
```

## Deployment

### Prerequisites for Deployment

-   Node.js runtime environment (v18.0.0 or higher)
-   PostgreSQL database
-   Google Cloud Storage bucket
-   SMTP server for email functionality

### Deployment Steps

1. Set up your production environment with the required prerequisites.

2. Clone the repository on your production server:

    ```bash
    git clone https://github.com/iadnanahsan/scoretrend-cms-backend.git
    cd scoretrend-cms-backend
    ```

3. Install production dependencies:

    ```bash
    npm install --production
    ```

4. Create a `.env` file with production values.

5. Build the application:

    ```bash
    npm run build
    ```

6. Set up a process manager like PM2:

    ```bash
    npm install -g pm2
    pm2 start dist/index.js --name scoretrend-cms
    ```

7. Set up a reverse proxy (Nginx or similar) to forward requests to the application.

## Project Structure

```
scoretrend-cms-backend/
├── config/                 # Configuration files
├── prisma/                 # Prisma schema and migrations
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Prisma schema definition
├── src/
│   ├── config/             # Application configuration
│   ├── controllers/        # Request handlers
│   ├── docs/               # Documentation files
│   ├── lib/                # Library code
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── schemas/            # Validation schemas
│   ├── services/           # Business logic
│   ├── swagger/            # Swagger documentation
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── index.ts            # Application entry point
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For any inquiries, please contact the project maintainers.
