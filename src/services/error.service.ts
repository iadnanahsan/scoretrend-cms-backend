import {SectionType, PageType} from "@prisma/client"
import logger from "../utils/logger"

// Error Types
export enum ValidationErrorCode {
	INVALID_SECTION_TYPE = "INVALID_SECTION_TYPE",
	DUPLICATE_SECTION = "DUPLICATE_SECTION",
	INVALID_FIELDS = "INVALID_FIELDS",
	SECTION_NOT_ALLOWED = "SECTION_NOT_ALLOWED",
	MISSING_REQUIRED_FIELDS = "MISSING_REQUIRED_FIELDS",
	INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT",
}

// Error Response Interfaces
export interface ValidationFieldError {
	field: string
	message: string
	error_type: "MISSING" | "INVALID_FORMAT" | "INVALID_VALUE"
	expected_format?: string
	example?: string
	current_value?: any
}

export interface ValidationErrorDetails {
	page_type?: PageType
	section_type?: SectionType
	attempted_section?: string
	existing_section_id?: string
	allowed_sections?: SectionType[]
	available_sections?: SectionType[]
	current_sections?: SectionType[]
	field_errors?: ValidationFieldError[]
}

export interface ValidationErrorHelp {
	suggestion: string
	examples?: string[]
	actions?: string[]
	documentation_link?: string
}

export interface ValidationErrorResponse {
	code: ValidationErrorCode
	message: string
	details: ValidationErrorDetails
	help: ValidationErrorHelp
}

export class ValidationErrorBuilder {
	private error: ValidationErrorResponse

	constructor(code: ValidationErrorCode, message: string) {
		this.error = {
			code,
			message,
			details: {},
			help: {
				suggestion: "",
			},
		}
	}

	withPageContext(pageType: PageType, allowedSections: SectionType[], currentSections: SectionType[]) {
		this.error.details.page_type = pageType
		this.error.details.allowed_sections = allowedSections
		this.error.details.current_sections = currentSections
		this.error.details.available_sections = allowedSections.filter((section) => !currentSections.includes(section))
		return this
	}

	withSectionType(sectionType: SectionType) {
		this.error.details.section_type = sectionType
		return this
	}

	withFieldErrors(errors: ValidationFieldError[]) {
		this.error.details.field_errors = errors
		return this
	}

	withHelp(suggestion: string, examples?: string[], actions?: string[]) {
		this.error.help = {
			suggestion,
			examples,
			actions,
		}
		return this
	}

	withExistingSection(sectionId: string) {
		this.error.details.existing_section_id = sectionId
		return this
	}

	build(): ValidationErrorResponse {
		// Log detailed error for debugging
		logger.debug("Validation Error:", {
			code: this.error.code,
			details: this.error.details,
		})
		return this.error
	}
}

export class SectionValidationError extends Error {
	constructor(response: ValidationErrorResponse) {
		super(JSON.stringify(response))
		this.name = "SectionValidationError"
	}
}

// Helper functions for common error scenarios
export function createInvalidSectionTypeError(
	pageType: PageType,
	attemptedSection: SectionType,
	allowedSections: SectionType[],
	currentSections: SectionType[]
): ValidationErrorResponse {
	return new ValidationErrorBuilder(
		ValidationErrorCode.INVALID_SECTION_TYPE,
		`Cannot create ${attemptedSection} section on ${pageType} page`
	)
		.withPageContext(pageType, allowedSections, currentSections)
		.withSectionType(attemptedSection)
		.withHelp(
			"Choose from available sections that haven't been created yet",
			allowedSections.filter((section) => !currentSections.includes(section)).map((section) => section.toString())
		)
		.build()
}

export function createDuplicateSectionError(
	pageType: PageType,
	sectionType: SectionType,
	sectionId: string,
	allowedSections: SectionType[],
	currentSections: SectionType[]
): ValidationErrorResponse {
	return new ValidationErrorBuilder(
		ValidationErrorCode.DUPLICATE_SECTION,
		`${sectionType} section already exists on this page`
	)
		.withPageContext(pageType, allowedSections, currentSections)
		.withSectionType(sectionType)
		.withExistingSection(sectionId)
		.withHelp(
			"Update existing section or choose from available sections",
			[],
			[
				`Update existing section at /api/v1/cms/sections/${sectionId}`,
				"Create a different section type from available_sections",
			]
		)
		.build()
}

export function createInvalidFieldsError(
	sectionType: SectionType,
	fieldErrors: ValidationFieldError[],
	requiredFields: string[],
	optionalFields: string[]
): ValidationErrorResponse {
	return new ValidationErrorBuilder(
		ValidationErrorCode.INVALID_FIELDS,
		`Invalid fields in ${sectionType} section content`
	)
		.withSectionType(sectionType)
		.withFieldErrors(fieldErrors)
		.withHelp(
			"Provide all required fields in correct format",
			[],
			[`Required fields: ${requiredFields.join(", ")}`, `Optional fields: ${optionalFields.join(", ")}`]
		)
		.build()
}

export function createFieldValidationError(
	sectionType: SectionType,
	fieldErrors: Array<{
		field: string
		error_type: "MISSING" | "INVALID_FORMAT" | "INVALID_VALUE"
		message?: string
		expected_format?: string
		example?: string
		current_value?: any
	}>
): ValidationErrorResponse {
	const formattedErrors = fieldErrors.map((err) => {
		const baseMessage = err.message || getDefaultFieldErrorMessage(err.error_type, err.field)
		return {
			field: err.field,
			error_type: err.error_type,
			message: baseMessage,
			expected_format: err.expected_format,
			example: err.example,
			current_value: err.current_value,
		}
	})

	const errorMessage = createFieldErrorSummary(sectionType, formattedErrors)

	return new ValidationErrorBuilder(ValidationErrorCode.INVALID_FIELDS, errorMessage)
		.withSectionType(sectionType)
		.withFieldErrors(formattedErrors)
		.withHelp(
			"Please fix the following field(s):",
			formattedErrors.map((err) => getFieldHelpMessage(err))
		)
		.build()
}

function getDefaultFieldErrorMessage(errorType: string, field: string): string {
	switch (errorType) {
		case "MISSING":
			return `The ${field} field is required`
		case "INVALID_FORMAT":
			return `The ${field} field has an invalid format`
		case "INVALID_VALUE":
			return `The ${field} field has an invalid value`
		default:
			return `Invalid ${field}`
	}
}

function createFieldErrorSummary(sectionType: string, errors: ValidationFieldError[]): string {
	if (errors.length === 1) {
		const err = errors[0]
		switch (err.error_type) {
			case "MISSING":
				return `Missing required field '${err.field}' in ${sectionType} section`
			case "INVALID_FORMAT":
				return `Invalid format for '${err.field}' in ${sectionType} section`
			case "INVALID_VALUE":
				return `Invalid value for '${err.field}' in ${sectionType} section`
		}
	}

	const invalidKeys = errors.map((e) => e.field).join(", ")
	return `Invalid or missing keys in ${sectionType} section. Found: ${invalidKeys}`
}

function getFieldHelpMessage(error: ValidationFieldError): string {
	const messages = []

	switch (error.error_type) {
		case "MISSING":
			if (error.field === "description") {
				messages.push(
					`Missing required field 'description'. This should be at the root level of content object`
				)
			} else if (error.field === "button") {
				messages.push(`The button field should be an object with 'text' and 'url' properties`)
				messages.push(`Example:
{
  "language": "en",
  "content": {
    "title": "Your Title",
    "description": "Your Description",
    "button": {
      "text": "Watch Now",
      "url": "https://youtube.com/..."
    }
  }
}`)
			} else if (error.field === "youtubeButtonTitle" || error.field === "youtubeButtonLink") {
				messages.push(`Invalid field name. Button properties should be nested under a 'button' object`)
				messages.push(`Use 'button.text' instead of 'youtubeButtonTitle'`)
				messages.push(`Use 'button.url' instead of 'youtubeButtonLink'`)
			} else if (error.field.startsWith("items.") && error.field.includes("date")) {
				messages.push(`Each timeline item must have a date in ISO format (e.g., '2025-03-14T19:38:00.000Z')`)
			}
			if (error.example) {
				messages.push(`Example: ${error.example}`)
			}
			break

		case "INVALID_FORMAT":
			if (error.field.includes(".")) {
				// For nested fields like 'cards.icon'
				messages.push(
					`Inside '${error.field.split(".")[0]}' array, each item must have '${error.field.split(".")[1]}'`
				)
			} else {
				messages.push(`Key '${error.field}' has wrong format`)
			}
			if (error.expected_format) {
				messages.push(`Expected format: ${error.expected_format}`)
			}
			if (error.example) {
				messages.push(`Example: ${error.example}`)
			}
			break

		case "INVALID_VALUE":
			messages.push(`Key '${error.field}' has invalid value`)
			if (error.expected_format) {
				messages.push(`Expected: ${error.expected_format}`)
			}
			if (error.current_value) {
				messages.push(`You provided: ${JSON.stringify(error.current_value)}`)
			}
			break
	}

	return messages.join(". ")
}
