import { QueryType } from "../query-proxy";

export class QueryString extends QueryType {
	valueOf(): string {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	startsWith(value: string): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	endsWith(value: string): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	includes(value: string): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}
