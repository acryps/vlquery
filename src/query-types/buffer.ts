import { QueryNumber, QueryType } from "..";

export class QueryBuffer extends QueryType {
    valueOf(): Buffer {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	byteLength(): QueryNumber {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}
