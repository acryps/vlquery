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
	isAfter: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} > ${fragment.call.parameters[0].toSQL()}`),
	isBefore: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} < ${fragment.call.parameters[0].toSQL()}`),
	includedIn: new QueryFunction(1, fragment => `${fragment.call.source.toSQL()} = ANY (${fragment.call.parameters[0].toSQL()})`),
	valueOf: new QueryFunction(0, fragment => fragment.call.source.toSQL())
}