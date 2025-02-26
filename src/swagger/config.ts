import swaggerUi from "swagger-ui-express"
import {SwaggerLoader} from "./loader"

// Initialize swagger docs
const swaggerLoader = SwaggerLoader.getInstance()
const swaggerDocs = swaggerLoader.loadDocs()

export const swaggerOptions: swaggerUi.SwaggerUiOptions = {
	explorer: true,
	swaggerOptions: {
		persistAuthorization: true,
		displayRequestDuration: true,
		docExpansion: "none",
		filter: true,
		showCommonExtensions: true,
		tryItOutEnabled: true,
		supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
	},
	customSiteTitle: "ScoreTrend CMS API Documentation",
	customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .scheme-container { margin: 20px 0 }
        .loading-container .loading:after { content: "Loading ScoreTrend CMS API Documentation"; }
    `,
}

export {swaggerDocs, swaggerUi}
