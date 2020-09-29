import { Queryable } from "./queryable";
import { Entity } from "./entity";
import { DbClient } from "./client";
import { QueryProxy } from "./query-proxy";
import { Query } from "./query";

export class DbSet<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> implements Queryable<TModel, TQueryProxy> {
	constructor(
		public modelConstructor: new () => TModel
	) {}

	get $meta() {
		return new this.modelConstructor().$meta;
	}
	
	async create(item: TModel) {
		const properties = this.getStoredProperties(item);

		const id = (await DbClient.query(`
		
			INSERT INTO ${item.$meta.tableName} (
				${properties.map(p => p.name)}
			) VALUES (
				${properties.map((p, i) => `$${i + 1}`)}
			) RETURNING id
		
		`, [
			properties
		]))[0].id;

		item.id = id;

		return item;
	}

	private getStoredProperties(item: TModel) {
		const properties: ({ 
			key: string, 
			value: any, 
			type: string, 
			name: string 
		})[] = [];
		
		for (let key in item) {
			const col = item.$meta.columns[key];

			if (col) {
				properties.push({
					key,
					value: item[key],
					type: col.type,
					name: col.name
				});
			}
		}

		return properties;
	}

	async find(id: string) {
		return await this.first(item => item.id == id);
	}

	private toQuery() {
		return new Query(this);
	}
	
	where(query: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		return this.toQuery().where(query);
	}

	first(query?: (item: TQueryProxy) => any): Promise<TModel> {
		return this.toQuery().first(query);
	}

	single(query?: (item: TQueryProxy) => any): Promise<TModel> {
		throw new Error("Uncompiled query cannot be used in runtime");
	}

	toArray(): Promise<TModel[]> {
		throw new Error("Method not implemented.");
	}

	include(selector: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	count: Promise<number>;

	orderByAscending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	orderByDescending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	skip(count: number): Queryable<TModel, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	limit(count: number): Queryable<TModel, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	page(index: number, size?: number): Queryable<TModel, TQueryProxy> {
		throw new Error("Method not implemented.");
	}
}