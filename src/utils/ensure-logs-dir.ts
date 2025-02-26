import {mkdirSync} from "fs"
import {join} from "path"

const LOGS_DIR = join(process.cwd(), "logs")

try {
	mkdirSync(LOGS_DIR, {recursive: true})
	console.log("Logs directory created/verified:", LOGS_DIR)
} catch (error) {
	console.error("Failed to create logs directory:", error)
	process.exit(1)
}
