import { QueryType } from "../query-proxy";

export class QueryString extends QueryType {
	valueOf(): string {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	startsWith(value: string | QueryString): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	endsWith(value: string | QueryString): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	includes(value: string | QueryString): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}

declare global {
	interface String {
		startsWith(value: string | QueryString): boolean;
		endsWith(value: string | QueryString): boolean;
		includes(value: string | QueryString): boolean;
	}
}