import { DbSet } from "../set";
import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { ForeignReference } from "../reference";
import { queryFunctions, QueryFunction } from "../functions";
import { QueryJoin } from "./join";
import { Query } from "../query";
import { CompiledQuery } from "../compiled-query";
import { QueryParameter } from "./parameter";
import { QueryExtent } from "./extent";

export class QueryFragment<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> {
	compare?: {
		left: QueryFragment<TModel, TQueryModel>;
		right: QueryFragment<TModel, TQueryModel>;
		operator: string;
	};

	logical?: {
		left: QueryFragment<TModel, TQueryModel>;
		right: QueryFragment<TModel, TQueryModel>;
		operator: string;
	};

	path: {
		column: string;
		extent: QueryExtent<TModel, TQueryModel>;
		part?: string;
	};

	call: {
		calls: {
			to: QueryFunction,
			parameters: QueryFragment<TModel, TQueryModel>[]
		}[];

		source: QueryFragment<TModel, TQueryModel>;
	};

	isNull: boolean;
	valueParameter: QueryParameter<TModel, TQueryModel>;

	constructor(
		public query: Query<TModel, TQueryModel>,
		tree: CompiledQuery
	) {
		if (tree.compare) {
			this.compare = {
				left: new QueryFragment<TModel, TQueryModel>(
					query,
					tree.compare.left
				),
				right: new QueryFragment<TModel, TQueryModel>(
					query,
					tree.compare.right
				),
				operator: tree.compare.operator
			};
		}

		if (tree.logical) {
			this.logical = {
				left: new QueryFragment<TModel, TQueryModel>(
					query,
					tree.logical.left
				),
				right: new QueryFragment<TModel, TQueryModel>(
					query,
					tree.logical.right
				),
				operator: tree.logical.operator
			};
		}

		if ("value" in tree) {
			if (tree.value === null) {
				this.isNull = true;
			}
			else {
				this.valueParameter = new QueryParameter(query, tree.value);
			}
		}

		if (tree.call) {
			this.call = {
                calls: tree.call.filter(e => typeof e != "string").map(item => ({
                    to: functions_1.queryFunctions[item.name],
                    parameters: item.parameters.map(p => new QueryFragment(query, p))
                })),
                source: new QueryFragment(query, {
                    path: tree.call.filter(e => typeof e == "string")
                })
            };
		}

		if (tree.path) {
			let set = this.query.set as DbSet<Entity<QueryProxy>, QueryProxy>;
			let extent = this.query.rootExtent;

			for (let i = 0; i < tree.path.length; i++) {
				const name = tree.path[i];
				const component = set.$$meta.columns[name];
				const proxy = new set.modelConstructor();

				if (component) {
					// simple attribute
					this.path = {
						column: component.name,
						extent
					};
				}
				else if (name in proxy) {
					// references
					const reference = proxy[name] as ForeignReference<Entity<QueryProxy>>;

					if (i == tree.path.length - 1) {
						// don't create join, just compare source column
						this.path = {
							column: reference.$$item.$$meta.columns[reference.$column].name,
							extent
						};
					}
					else {
						const join = new QueryJoin(
							query,
							extent,
							(new reference.$relation()).$$meta.tableName,
							reference.$$item.$$meta.columns[reference.$column].name
						);

						extent = join.extent;
						set = new reference.$relation().$$meta.set;
					}
				}
				else {
					this.path.part = name;
				}
			}
		}
	}

	toSQL() {
		if (this.compare) {
			if (this.compare.left.isNull) {
				if (this.compare.operator == "=") {
					return `${this.compare.right.toSQL()} IS NULL`;
				}

				if (this.compare.operator == "!=") {
					return `${this.compare.right.toSQL()} IS NOT NULL`;
				}
			}

			if (this.compare.right.isNull) {
				if (this.compare.operator == "=") {
					return `${this.compare.left.toSQL()} IS NULL`;
				}

				if (this.compare.operator == "!=") {
					return `${this.compare.left.toSQL()} IS NOT NULL`;
				}
			}

			return `(${
				this.compare.left.toSQL()} ${this.compare.operator} ${
				this.compare.right.toSQL()})`;
		}

		if (this.logical) {
			return `(${
				this.logical.left.toSQL()} ${this.logical.operator} ${
				this.logical.right.toSQL()})`;
		}

		if (this.call) {
			let body = this.call.source.toSQL();

            for (let call of this.call.calls) {
                body = call.to.toSQL(this, body, call.parameters);
            }

            return `(${body})`;
		}

		if (this.valueParameter) {
			;
			return this.valueParameter.name;
		}

		if (this.path) {
			if (this.path.part) {
				const part = {
					year: "YEAR",
					month: "MONTH",
					date: "DAY",
					hour: "HOUR",
					minute: "MINUTE",
					second: "SECOND",
					milisecond: "MILLISECONDS",
					week: "WEEK",
					dayOfWeek: "DOW",
					microseconds: "MICROSECONDS"
				}[this.path.part];

				if (!part) {
					return new Error(`Invalid column part '${this.path.part}' in column '${this.path.column}'`);
				}

				return `EXTRACT(${part} FROM ${this.path.extent.name}.${this.path.column})`;
			}

			return `${this.path.extent.name}.${this.path.column}`;
		}
	}
}
