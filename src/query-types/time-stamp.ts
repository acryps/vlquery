import { QueryDate, QueryString } from ".";
import { QueryType } from "../query-proxy";

export class QueryTimeStamp extends QueryType {
	valueOf(): Date {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	toDate(): QueryDate {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isBefore(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isAfter(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	toISODate(): QueryString {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	year: number;
	month: number;
	date: number;
	hour: number;
	minute: number;
	second: number;
	milisecond: number;
	week: number;
	dayOfWeek: number;
	microseconds: number;
}
