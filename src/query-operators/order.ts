import { DbSet } from "../set";
import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { ForeignReference } from "../reference";
import { QueryJoin } from "./join";
import { QueryExtent } from "./extent";
import { Query } from "../query";
import { CompiledQuery, CompiledQueryCall } from "../compiled-query";
import { QueryFunction, queryFunctions } from "../functions";

export class QueryOrder<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	children: QueryOrder<TModel, TQueryModel>[];

	extent: QueryExtent<TModel, TQueryModel>;
	column: string;
	calls: CompiledQueryCall[];

	constructor(
		public query: Query<TModel, TQueryModel>,
		sorterTree: CompiledQuery,
		public direction: "asc" | "desc"
	) {
		if (sorterTree.logical) {
			this.children = [
				new QueryOrder(query, sorterTree.logical.left, direction),
				new QueryOrder(query, sorterTree.logical.right, direction)
			];
		} else {
			let path: string[] = [];

			if (sorterTree.call) {
				this.calls = [];

				for (let item of sorterTree.call.stack) {
					if (typeof item == "string") {
						path.push(item);
					} else {
						this.calls.push(item);
					}
				}
			} else {
				path = sorterTree.path;
			}

			this.extent = query.rootExtent;

			let set = query.set as DbSet<Entity<QueryProxy>, QueryProxy>;

			for (let i = 0; i < path.length - 1; i++) {
				const name = path[i];

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

			this.column = set.$$meta.columns[path[path.length - 1]];
		}
	}

	private toSQLFragment() {
		if (this.children) {
			return `COALESCE(${this.children.map(child => child.toSQLFragment()).join(", ")})`;
		} else if (this.calls) {
			let body = `(${this.extent.name}.${this.column})`;

			for (let call of this.calls) {
				const fx = queryFunctions[call.name] as QueryFunction;

				body = fx.toSQL(body, call.parameters);
			}

			return body;
		} else {
			return `${this.extent.name}.${this.column}`;
		}
	}

	toSQL() {
		return `${this.toSQLFragment()} ${this.direction}`
	}
}

export class QueryOrderProperty<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	extent: QueryExtent<TModel, TQueryModel>;
	column: { name: string; type: string; };

	toSQL() {
		return `${this.extent.name}.${this.column.name}`;
	}
}