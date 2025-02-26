# Node.js Project Dependencies Documentation

## Summary

This document outlines all the necessary dependencies for the project, along with their purposes and the latest versions as of February 12, 2025. Additionally, installation instructions for the dependencies are provided.

---

## Dependencies List

### Core Dependencies

| Dependency              | Version | Description                                                            |
| ----------------------- | ------- | ---------------------------------------------------------------------- |
| `express`               | ^4.19.2 | Minimal and flexible Node.js web application framework.                |
| `cors`                  | ^2.8.5  | Middleware to enable Cross-Origin Resource Sharing (CORS).             |
| `dotenv`                | ^16.4.5 | Loads environment variables from a `.env` file into `process.env`.     |
| `jsonwebtoken`          | ^9.0.2  | For generating and verifying JSON Web Tokens (JWT) for authentication. |
| `bcrypt`                | ^5.1.0  | Library to hash passwords securely.                                    |
| `zod`                   | ^3.24.2 | TypeScript-first schema validation with static type inference.         |
| `@prisma/client`        | ^6.0.0  | Auto-generated client for database interactions when using Prisma ORM. |
| `@google-cloud/storage` | ^7.14.0 | For interacting with Google Cloud Storage to manage media files.       |
| `swagger-ui-express`    | ^5.0.0  | Middleware to serve Swagger API documentation in an Express app.       |
| `uuid`                  | ^11.0.5 | Generates universally unique identifiers (UUIDs).                      |
| `nodemailer`            | ^6.9.13 | Library for sending emails.                                            |

### Additional Dependencies

| Dependency           | Version | Description                                                              |
| -------------------- | ------- | ------------------------------------------------------------------------ |
| `helmet`             | ^6.0.0  | Adds security headers to HTTP responses.                                 |
| `compression`        | ^2.0.0  | Middleware to compress HTTP responses.                                   |
| `morgan`             | ^1.11.0 | HTTP request logger middleware.                                          |
| `express-rate-limit` | ^7.0.0  | Middleware to prevent brute-force attacks by limiting repeated requests. |
| `sanitize-html`      | ^2.7.0  | Sanitizes user input to prevent XSS attacks.                             |
| `winston`            | ^4.0.0  | Logging library with support for various transports.                     |

### DevDependencies

| Dependency                               | Version   | Description                                                  |
| ---------------------------------------- | --------- | ------------------------------------------------------------ |
| `typescript`                             | ^5.4.5    | Adds static typing to JavaScript.                            |
| `ts-node`                                | ^10.9.2   | Executes TypeScript directly without compiling.              |
| `@types/node`                            | ^20.12.12 | Type definitions for Node.js.                                |
| `@types/express`                         | ^4.17.21  | Type definitions for Express.                                |
| `@types/jsonwebtoken`                    | ^9.0.6    | Type definitions for `jsonwebtoken`.                         |
| `@types/bcrypt`                          | ^5.0.0    | Type definitions for `bcrypt`.                               |
| `@typescript-eslint/eslint-plugin`       | ^6.21.0   | ESLint rules for TypeScript.                                 |
| `@typescript-eslint/parser`              | ^6.21.0   | ESLint parser for TypeScript.                                |
| `eslint`                                 | ^8.57.0   | Pluggable JavaScript linter.                                 |
| `eslint-config-standard-with-typescript` | ^43.0.1   | ESLint configuration for TypeScript projects.                |
| `eslint-plugin-import`                   | ^2.29.1   | Linting plugin for import/export syntax.                     |
| `eslint-plugin-n`                        | ^16.6.2   | Linting plugin for Node.js best practices.                   |
| `eslint-plugin-promise`                  | ^6.1.1    | Linting rules for JavaScript promises.                       |
| `nodemon`                                | ^3.1.2    | Monitors code changes and automatically restarts the server. |
| `prisma`                                 | ^6.0.0    | Prisma CLI for managing the database schema.                 |
| `prisma-dbml-generator`                  | ^0.12.0   | Generates DBML files for visualizing the database schema.    |
| `prisma-erd-generator`                   | ^1.11.2   | Generates ER diagrams from Prisma schema.                    |

---

## Installation Instructions

To install all dependencies with the latest versions, use the following commands:

1. Install core dependencies:

```bash
npm install express@latest cors@latest dotenv@latest jsonwebtoken@latest bcrypt@latest zod@latest @prisma/client@latest @google-cloud/storage@latest swagger-ui-express@latest uuid@latest nodemailer@latest
```

2. Install additional dependencies:

```bash
npm install helmet@latest compression@latest morgan@latest express-rate-limit@latest sanitize-html@latest winston@latest
```

3. Install devDependencies:

```bash
npm install --save-dev typescript@latest ts-node@latest @types/node@latest @types/express@latest @types/jsonwebtoken@latest @types/bcrypt@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest eslint@latest eslint-config-standard-with-typescript@latest eslint-plugin-import@latest eslint-plugin-n@latest eslint-plugin-promise@latest nodemon@latest prisma@latest prisma-dbml-generator@latest prisma-erd-generator@latest
```

### Why Use `@latest`?

Using the `@latest` flag ensures that you always install the most recent stable version of a package. This is particularly useful for:

-   Keeping your project up to date with the latest features and performance improvements.
-   Automatically including patches for known bugs or vulnerabilities.

To update an existing dependency to its latest version, simply rerun the install command with the `@latest` tag. Always verify compatibility with your project before deploying updates to production.

---

## Notes

1. Always test new dependencies in a development environment before deploying to production.
2. Update dependencies regularly to avoid security vulnerabilities.
3. Use `npm audit` to check for known vulnerabilities in your installed packages.
