import { QueryType } from "..";

export class QueryJSON extends QueryType {
	valueOf(): any {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}