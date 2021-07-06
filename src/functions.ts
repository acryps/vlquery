import { Query, Entity, QueryProxy } from ".";
import { QueryFragment } from "./query-operators/fragment";

export class QueryFunction {
	constructor(
		public argCount: number | [number, number],
		public converter: (fragment: QueryFragment<Entity<QueryProxy>, QueryProxy>) => string,
	) {}

	toSQL(fragment: QueryFragment<Entity<QueryProxy>, QueryProxy>) {
		if (typeof this.argCount == "number" && fragment.call.parameters.length != this.argCount) {
			throw new Error(`Invalid parameter count for query function`);
		}

		if (Array.isArray(this.argCount) && (fragment.call.parameters.length > Math.max(...this.argCount) || fragment.call.parameters.length < Math.min(...this.argCount))) {
			throw new Error(`Invalid parameter count for query function`);
		}

		return this.converter(fragment);
	}
}

export const queryFunctions = {
	// date operators
	isAfter: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} > ${fragment.call.parameters[0].toSQL()}`),
	isBefore: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} < ${fragment.call.parameters[0].toSQL()}`),

	// id array operators
	includedIn: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} = ANY (${fragment.call.parameters[0].toSQL()})`),

	// string operators
	startsWith: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} LIKE ${fragment.call.parameters[0].toSQL()} || '%'`),
	startOf: new QueryFunction(1, fragment => `${fragment.call.parameters[0].toSQL()} LIKE ${fragment.call.source.toSQL()} || '%'`),

	endsWith: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} LIKE '%' || ${fragment.call.parameters[0].toSQL()}`),
	endOf: new QueryFunction(1, fragment => `${fragment.call.parameters[0].toSQL()} LIKE '%' || ${fragment.call.source.toSQL()}`),

	includes: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} LIKE '%' || ${fragment.call.parameters[0].toSQL()} || '%'`),
	substringOf: new QueryFunction(1, fragment => `${fragment.call.parameters[0].toSQL()} LIKE '%' || ${fragment.call.source.toSQL()} || '%'`),

	uppercase: new QueryFunction(0, fragment => `UPPER(${fragment.call.parameters[0].toSQL()})`),
	lowercase: new QueryFunction(0, fragment => `LOWER(${fragment.call.parameters[0].toSQL()})`),

	// generic
	valueOf: new QueryFunction(0, fragment => fragment.call.source.toSQL())
}