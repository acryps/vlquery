import { DbSet } from "../set";
import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { ForeignReference } from "../reference";
import { QueryJoin } from "./join";
import { QueryExtent } from "./extent";
import { Query } from "../query";
import { CompiledQuery, CompiledQueryCall } from "../compiled-query";
import { QueryFunction, queryFunctions } from "../functions";
import { QueryFragment } from "./fragment";

export class QueryOrder<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	children: QueryOrder<TModel, TQueryModel>[];

	extent: QueryExtent<TModel, TQueryModel>;
	fragment: QueryFragment<TModel, TQueryModel>;

	constructor(
		public query: Query<TModel, TQueryModel>,
		tree: CompiledQuery,
		public direction: "asc" | "desc"
	) {
		if (tree.logical) {
			this.children = [
				new QueryOrder(query, tree.logical.left, direction),
				new QueryOrder(query, tree.logical.right, direction)
			];
		} else {
			this.fragment = new QueryFragment(query, tree);
		}
	}

	private toSQLFragment() {
		if (this.children) {
			return `COALESCE(${this.children.map(child => child.toSQLFragment()).join(", ")})`;
		} else {
			return this.fragment.toSQL();
		}
	}

	toSQL() {
		return `${this.toSQLFragment()} ${this.direction}`
	}
}