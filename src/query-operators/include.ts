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
		selector: (item: TQueryModel) => any
	) {
		const proxy = new query.set.modelConstructor();

		this.relation = selector(proxy as unknown as TQueryModel);

		this.extent = new QueryJoin(
			query,
			query.rootExtent,
			new this.relation.$relation().$meta.tableName,
			this.relation.$item.$meta.columns[this.relation.$column].name
		).extent;

		if (!(this.relation instanceof ForeignReference)) {
			throw new Error(`Invalid include selector '${selector}'`);
		}

		this.prefix = `inc${this.query.includes.length}_`;
	}

	toSQL() {
		const cols = new this.relation.$relation().$meta.columns;

		return Object.keys(cols).map(key => `${this.extent.name}.${cols[key].name} AS ${this.prefix}${cols[key].name}`).join(", ");
	}
}
