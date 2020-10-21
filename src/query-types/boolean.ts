import { QueryType } from "../query-proxy";

export class QueryBoolean extends QueryType {
	valueOf(): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}
