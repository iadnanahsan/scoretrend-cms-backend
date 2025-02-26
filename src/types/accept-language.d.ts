declare module "accept-language" {
	function languages(langs: string[]): void
	function get(acceptLanguageHeader: string): string | undefined
	export = {languages, get}
}
