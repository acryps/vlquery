import { QueryType } from "../query-proxy";

export class QueryNumber extends QueryType {
	valueOf(): number {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}
