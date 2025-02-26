const swaggerJsDoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express")

const options = {
	definition: {
		openapi: "3.0.0", // Ensure this version is correct
		info: {
			title: "Work Time Hero API",
			version: "1.0.0", // Version of your API
			description: "API documentation for Work Time Hero backend.",
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
		security: [
			{
				bearerAuth: [], // Apply security globally
			},
		],
	},
	apis: ["./routes/*.js"], // Path to the route files for annotations
}

const swaggerDocs = swaggerJsDoc(options)

module.exports = {swaggerDocs, swaggerUi}
