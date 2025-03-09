import winston from "winston"

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "debug",
	format: winston.format.combine(
		winston.format.timestamp({
			format: "YYYY-MM-DD HH:mm:ss",
		}),
		winston.format.errors({stack: true}),
		winston.format.splat(),
		winston.format.json()
	),
	defaultMeta: {service: "scoretrend-cms"},
	transports: [
		new winston.transports.File({filename: "logs/error.log", level: "error"}),
		new winston.transports.File({filename: "logs/combined.log"}),
	],
})

// Always add console transport with detailed formatting
logger.add(
	new winston.transports.Console({
		level: "debug", // Ensure debug level for console
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			winston.format.printf((info) => {
				const {timestamp, level, message, ...rest} = info
				let logMessage = `[${timestamp}] ${level}: ${message}`

				// Add detailed object information if available
				if (Object.keys(rest).length > 0) {
					// Remove service from the output to reduce noise
					const {service, ...restWithoutService} = rest
					if (Object.keys(restWithoutService).length > 0) {
						logMessage += `\n${JSON.stringify(restWithoutService, null, 2)}`
					}
				}

				return logMessage
			})
		),
	})
)

export default logger
