import { DbSet } from "../set";
import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { ForeignReference } from "../reference";
import { QueryJoin } from "./join";
import { QueryExtent } from "./extent";
import { Query } from "../query";

export class QueryOrder<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	properties: QueryOrderProperty<TModel, TQueryModel>[];

	constructor(
		public query: Query<TModel, TQueryModel>,
		sorter: (item: TQueryModel) => any,
		public direction: "asc" | "desc"
	) {
		const body = sorter.toString().split("=>")[1];
		this.properties = [];

		for (let property of body.split("||")) {
			const prop = new QueryOrderProperty();
			const properties = property.trim().split(".").map(v => v.trim()).slice(1);

			prop.extent = query.rootExtent;
			let set = query.set as DbSet<Entity<QueryProxy>, QueryProxy>;
	
			for (let i = 0; i < properties.length - 1; i++) {
				const name = properties[i];
				const proxy = new set.modelConstructor();
				const reference = proxy[name] as ForeignReference<Entity<QueryProxy>>;
	
				const join = new QueryJoin(
					query,
					prop.extent,
					(new reference.$relation()).$$meta.tableName,
					reference.$$item.$$meta.columns[reference.$column].name
				);
	
				prop.extent = join.extent;
				set = new reference.$relation().$$meta.set;
			}
	
			prop.column = set.$$meta.columns[properties[properties.length - 1]];

			this.properties.push(prop);
		}
	}

	toSQL() {
		if (this.properties.length == 1) {
			return `${this.properties[0].toSQL()} ${this.direction}`;
		}

		return `COALESCE(${this.properties.map(p => p.toSQL()).join(", ")}) ${this.direction}`
	}
}

export class QueryOrderProperty<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	extent: QueryExtent<TModel, TQueryModel>;
	column: { name: string; type: string; };

	toSQL() {
		return `${this.extent.name}.${this.column.name}`;
	}
}