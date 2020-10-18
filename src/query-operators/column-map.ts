import { Entity, QueryProxy, Query } from "..";

export class QueryColumnMapping<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	public name: string;
	
	constructor(
		private query: Query<TModel, TQueryModel>,
		private path: string[],
		private type: string
	) {
		// use base 36 string as key to reduce characters used
		// 100'000 in base 36 is '255r', which is quite short compared
		this.name = query.columnMappings.length.toString(36);

		// keep track of all column mappings
		// required to back-solve mappings later on
		query.columnMappings.push(this);
	}
}