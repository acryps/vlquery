import { Query, Entity, QueryProxy } from ".";
import { QueryFragment } from "./query-operators/fragment";

export class QueryFunction {
	constructor(
		public argCount: number | [number, number],
		public converter: (fragment: QueryFragment<Entity<QueryProxy>, QueryProxy>, body: string, parameters: QueryFragment<Entity<QueryProxy>, QueryProxy>[]) => string,
	) {}

	toSQL(fragment: QueryFragment<Entity<QueryProxy>, QueryProxy>, body, parameters) {
		if (typeof this.argCount == "number" && parameters.length != this.argCount) {
			throw new Error(`Invalid parameter count for query function`);
		}

		if (Array.isArray(this.argCount) && (parameters.length > Math.max(...this.argCount) || parameters.length < Math.min(...this.argCount))) {
			throw new Error(`Invalid parameter count for query function`);
		}

		return this.converter(fragment, body, parameters);
	}
}

export const queryFunctions = {
	// date operators
	isAfter: new QueryFunction(1, (fragment, body, parameters) => `${body} > ${parameters[0].toSQL()}`),
	isBefore: new QueryFunction(1, (fragment, body, parameters) => `${body} < ${parameters[0].toSQL()}`),

	// id array operators
	includedIn: new QueryFunction(1, (fragment, body, parameters) => `${body} = ANY (${parameters[0].toSQL()})`),

	// string search operators
	startsWith: new QueryFunction(1, (fragment, body, parameters) => `${body} LIKE ${parameters[0].toSQL()} || '%'`),
	startOf: new QueryFunction(1, (fragment, body, parameters) => `${parameters[0].toSQL()} LIKE ${body} || '%'`),

	endsWith: new QueryFunction(1, (fragment, body, parameters) => `${body} LIKE '%' || ${parameters[0].toSQL()}`),
	endOf: new QueryFunction(1, (fragment, body, parameters) => `${parameters[0].toSQL()} LIKE '%' || ${body}`),

	includes: new QueryFunction(1, (fragment, body, parameters) => `${body} LIKE '%' || ${parameters[0].toSQL()} || '%'`),
	substringOf: new QueryFunction(1, (fragment, body, parameters) => `${parameters[0].toSQL()} LIKE '%' || ${body} || '%'`),

	// string case operators
	uppercase: new QueryFunction(0, (fragment, body, parameters) => `UPPER(${body})`),
	lowercase: new QueryFunction(0, (fragment, body, parameters) => `LOWER(${body})`),

	// generic
	valueOf: new QueryFunction(0, (fragment, body, parameters) =>body)
}