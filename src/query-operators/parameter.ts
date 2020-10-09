import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { Query } from "../query";

export class QueryParameter<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	name: string;

	constructor(
		public query: Query<TModel, TQueryModel>,
		public value: any
	) {
		query.parameters.push(this);

		this.name = `$${query.parameters.length}`;
	}
}
