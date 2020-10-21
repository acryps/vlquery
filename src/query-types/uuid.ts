import { QueryType } from "..";

export class QueryUUID extends QueryType {
	includedIn(ids: string[]): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	valueOf(): string {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}