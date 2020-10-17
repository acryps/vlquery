import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { ForeignReference } from "../reference";
import { QueryJoin } from "./join";
import { QueryExtent } from "./extent";
import { Query } from "../query";

export class QueryInclude<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	relation: ForeignReference<TModel>;
	prefix: string;
	extent: QueryExtent<TModel, TQueryModel>;

	constructor(
		public query: Query<TModel, TQueryModel>,
		selectorOrTree: ((item: TQueryModel) => any) | any
	) {
		if (typeof selectorOrTree == "function") {
			const proxy = new query.set.modelConstructor();

			const parts = selectorOrTree.toString().split("=>");
			const itemParameter = parts[0].trim().replace(/\(|\)/g, "");
			const path = parts[1].replace(`${itemParameter}.`, "").trim().split(".");

			const tree = {};

			return new QueryInclude<TModel, TQueryModel>(query, tree);
		} else {
			query.fetchTree = selectorOrTree;
		}
	}

	toSQL() {
		const cols = new this.relation.$relation().$meta.columns;

		return Object.keys(cols).map(key => `${this.extent.name}.${cols[key].name} AS ${this.prefix}${cols[key].name}`).join(", ");
	}
}
