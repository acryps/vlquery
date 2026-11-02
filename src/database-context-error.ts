export class DatabaseContextError extends Error {
	constructor(message: string) {
		super(message);

		this.name = "DatabaseContextError";
	}
}
