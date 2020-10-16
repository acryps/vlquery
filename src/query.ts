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
import { ForeignReference } from ".";

export class Query<TModel extends Entity<TQueryModel>, TQueryModel extends QueryProxy> implements Queryable<TModel, TQueryModel> {
	public limitRows = -1;
	public skipRows = -1;
	public selectClause = "";
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

		this.selectClause = `${this.rootExtent.name}.*`;

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
		if (query) {
			this.where(query);
		}

		const res = await this.limit(2).toArray();

		if (res.length != 1) {
			throw new Error(`Single query returned ${res.length == 0 ? "no" : "multiple"} items`);
		}

		return res[0];
	}

	private async toArrayRaw(): Promise<any[]> {
		return await DbClient.query(this.toSQL(), this.parameters.map(p => p.value));
	}

	async toArray(): Promise<TModel[]> {
		return (await this.toArrayRaw()).map(raw => this.set.constructObject(raw, this.includes));
	}

	select(properties: string[]): Queryable<TModel, TQueryModel> {
		const select = [];
		const proxy = new this.set.modelConstructor();

		for (let property of properties) {
			if (this.set.$meta[property]) {
				select.push(this.set.$meta[property].name);
			} else if (proxy[property] instanceof ForeignReference) {
				this.include(() => proxy[property]);

				select.push(this.set.$meta[proxy[property].$column].name);
			}
		}

		this.selectClause = select.map(s => `${this.rootExtent.name}.${select}`).join(", ");

		return this;
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
		const wheres = this.conditions.map(c => c.toSQL());

		if (this.set.$meta.active) {
			wheres.unshift(`${this.rootExtent.name}.${this.set.$meta.active}`);
		}

		return `
		
			SELECT ${this.onlyCount ? `COUNT(${this.rootExtent.name}) AS count` : `${this.selectClause}${this.includes.map(i => `, ${i.toSQL()}`)}`}
			FROM ${this.set.$meta.tableName} AS ${this.rootExtent.name}
			${this.joins.map(j => j.toSQL()).join("\n")}
			${wheres.length ? `WHERE ${wheres.join(" AND ")}` : ""}
			${this.orders.length ? `ORDER BY ${this.orders.map(order => order.toSQL()).join(", ")}` : ""}
			${this.limitRows == -1 ? "" : `LIMIT ${new QueryParameter(this, this.limitRows).name}`}
			${this.skipRows == -1 ? "" : `OFFSET ${new QueryParameter(this, this.skipRows).name}`}
		
		`;
	}
}