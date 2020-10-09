import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { Query } from "../query";

export class QueryExtent<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	name: string;

	constructor(
		public query: Query<TModel, TQueryModel>
	) {
		this.name = `ext${query.extentIndex++}`;
	}
}
