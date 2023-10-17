import { Entity, QueryProxy, Query } from "..";
import { View } from "../view";

export class QueryColumnMapping<TModel extends Entity<TQueryModel> | View<TQueryModel>, TQueryModel extends QueryProxy> {
	public name: string;
	
	constructor(
		query: Query<TModel, TQueryModel>,
		public path: string[],
		public type: string
	) {
		// use base 36 string as key to reduce characters used
		// 100'000 in base 36 is '255r', which is quite short compared to just using the number
		this.name = query.columnMappings.length.toString(36);

		// keep track of all column mappings
		// required to back-solve mappings later on
		query.columnMappings.push(this);
	}

	get lastComponent() {
		return this.path[this.path.length - 1];
	}
}