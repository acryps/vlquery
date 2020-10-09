import { DbSet } from "./set";
import { Queryable } from "./queryable";
import { Entity } from "./entity";
import { QueryProxy } from "./query-proxy";
import { DbClient } from "./client";
import { QueryJoin } from "./query-operators/join";
import { QueryFragment } from "./query-operators/fragment";
import { QueryExtent } from "./query-operators/extent";
import { QueryParameter } from "./query-operators/parameter";
import { CompiledQuery } from "./compiled-query";
import { QueryOrder } from "./query-operators/order";
import { QueryInclude } from "./query-operators/include";

export class Query<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> implements Queryable<TModel, TQueryModel> {
	public limitRows = -1;
	public skipRows = -1;
	public joins: QueryJoin<TModel, TQueryModel>[] = [];
	public conditions: QueryFragment<TModel, TQueryModel>[] = [];
	public parameters: QueryParameter<TModel, TQueryModel>[] = [];
	public orders: QueryOrder<TModel, TQueryModel>[] = [];
	public includes: QueryInclude<TModel, TQueryModel>[] = [];
	public onlyCount: boolean;

	public rootExtent: QueryExtent<TModel, TQueryModel>;
	public extentIndex = 0;

	static defaultPageSize = 100;
	
	constructor(public set: DbSet<TModel, TQueryModel>, preConditions?: CompiledQuery[]) {
		this.rootExtent = new QueryExtent(this);

		if (preConditions) {
			for (let condition of preConditions) {
				this.where(condition as unknown as (item: TQueryModel) => any);
			}
		}
	}

	where(query: (item: TQueryModel) => any): Queryable<TModel, TQueryModel> {
		// ensure compiled query
		if (typeof query == "function") {
			throw new Error("Uncompiled query cannot be used in runtime");
		}

		this.conditions.push(new QueryFragment(this, query as CompiledQuery));

		return this;
	}

	async first(query?: (item: TQueryModel) => any): Promise<TModel> {
		if (query) {
			this.where(query);
		}

		this.limit(1);

		return (await this.toArray())[0];
	}

	async single(query?: (item: TQueryModel) => any): Promise<TModel> {
		const res = await this.first(query);

		if (!res) {
			throw new Error("Single query returned zero items");
		}

		return res;
	}

	private async toArrayRaw(): Promise<any[]> {
		const sql = this.toSQL();

		console.log(
			"SQL " + "-".repeat(30 - 4), 
			sql.replace(/\$[0-9]+/g, match => `<${this.parameters[+match.replace("$", "") - 1].value}>`), 
			"-".repeat(30)
		);

		return await DbClient.query(sql, this.parameters.map(p => p.value));
	}

	async toArray(): Promise<TModel[]> {
		return (await this.toArrayRaw()).map(raw => this.set.constructObject(raw, this.includes));
	}

	include(selector: (item: TQueryModel) => any): Queryable<TModel, TQueryModel> {
		this.includes.push(new QueryInclude(this, selector));

		return this;
	}

	get count(): Promise<number> {
		this.onlyCount = true;

		return this.toArrayRaw().then(raw => raw[0].count);
	}

	orderByAscending(sorter: (item: TQueryModel) => any): Queryable<TModel, TQueryModel> {
		this.orders.push(new QueryOrder(this, sorter, "asc"));

		return this;
	}

	orderByDescending(sorter: (item: TQueryModel) => any): Queryable<TModel, TQueryModel> {
		this.orders.push(new QueryOrder(this, sorter, "dsc"));

		return this;
	}

	skip(count: number): Queryable<TModel, TQueryModel> {
		this.skipRows = count;

		return this;
	}

	limit(count: number): Queryable<TModel, TQueryModel> {
		this.limitRows = count;

		return this;
	}

	page(index: number, size?: number): Queryable<TModel, TQueryModel> {
		size = size || Query.defaultPageSize;

		return this.limit(size).skip(index * size);
	}

	toSQL() {
		return `
		
			SELECT ${this.onlyCount ? `COUNT(${this.rootExtent.name}) AS count` : `${this.rootExtent.name}.*${this.includes.map(i => `, ${i.toSQL()}`)}`}
			FROM ${this.set.$meta.tableName} AS ${this.rootExtent.name}
			${this.joins.map(j => j.toSQL()).join("\n")}
			WHERE ${this.rootExtent.name}._active${this.conditions.length ? " AND " : ""}${this.conditions.map(c => c.toSQL()).join(" AND ")}
			${this.orders.length ? `ORDER BY ${this.orders.map(order => order.toSQL()).join(", ")}` : ""}
			${this.limitRows == -1 ? "" : `LIMIT ${new QueryParameter(this, this.limitRows).name}`}
			${this.skipRows == -1 ? "" : `OFFSET ${new QueryParameter(this, this.skipRows).name}`}
		
		`;
	}
}