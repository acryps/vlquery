import { QueryType } from "../query-proxy";

export class QueryDate extends QueryType {
	valueOf(): Date {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isBefore(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isAfter(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	year: number;
	month: number;
	date: number;
	week: number;
	dayOfWeek: number;
}
