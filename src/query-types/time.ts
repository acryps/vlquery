import { QueryType } from "../query-proxy";

export class QueryTime extends QueryType {
	valueOf(): Date {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	hour: number;
	minute: number;
	second: number;
	milisecond: number;
	microseconds: number;
}
