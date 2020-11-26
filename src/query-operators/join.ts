import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { Query } from "../query";
import { QueryExtent } from "./extent";

export class QueryJoin<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	extent: QueryExtent<TModel, TQueryModel>;

	constructor(
		public query: Query<TModel, TQueryModel>,
		public from: QueryExtent<TModel, TQueryModel>,
		public table: string,
		public column: string
	) {
		this.extent = new QueryExtent(query);

		this.query.joins.push(this);
	}

	toSQL() {
		return `LEFT JOIN ${this.table} AS ${this.extent.name} ON${this.query.set.$meta.active ? ` ${this.extent.name}.${this.query.set.$meta.active} AND` : ""} ${this.from.name}.${this.column} = ${this.extent.name}.id`;
	}
}
