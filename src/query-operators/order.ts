import { DbSet } from "../set";
import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { ForeignReference } from "../reference";
import { QueryJoin } from "./join";
import { QueryExtent } from "./extent";
import { Query } from "../query";

export class QueryOrder<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	extent: QueryExtent<TModel, TQueryModel>;
	column: { name: string; type: string; };

	constructor(
		public query: Query<TModel, TQueryModel>,
		sorter: (item: TQueryModel) => any,
		public direction: "asc" | "desc"
	) {
		const properties = sorter.toString().split("=>")[1].split(".").map(v => v.trim()).slice(1);

		this.extent = query.rootExtent;
		let set = query.set as DbSet<Entity<QueryProxy>, QueryProxy>;

		for (let i = 0; i < properties.length - 1; i++) {
			const name = properties[i];
			const proxy = new set.modelConstructor();
			const reference = proxy[name] as ForeignReference<Entity<QueryProxy>>;

			const join = new QueryJoin(
				query,
				this.extent,
				(new reference.$relation()).$$meta.tableName,
				reference.$$item.$$meta.columns[reference.$column].name
			);

			this.extent = join.extent;
			set = new reference.$relation().$$meta.set;
		}

		this.column = set.$$meta.columns[properties[properties.length - 1]];
	}

	toSQL() {
		return `${this.extent.name}.${this.column.name} ${this.direction}`;
	}
}
