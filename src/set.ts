import { Queryable } from "./queryable";
import { Entity } from "./entity";
import { DbClient } from "./client";
import { QueryProxy } from "./query-proxy";
import { Query, QueryInclude } from "./query";
import { ForeignReference } from ".";

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

	async update(item: TModel) {
		const properties = this.getStoredProperties(item);

		const id = (await DbClient.query(`
		
			UPDATE ${item.$meta.tableName} 
			SET ${properties.map((p, i) => `${p.name} = $${i + 2}`)}
			WHERE id = $1
		
		`, [
			item.id,
			...properties.map(p => p.value)
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
		return this.toQuery().single(query);
	}

	toArray(): Promise<TModel[]> {
		return this.toQuery().toArray();
	}

	include(selector: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		return this.toQuery().include(selector);
	}

	count: Promise<number>;

	orderByAscending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		return this.toQuery().orderByAscending(sorter);
	}

	orderByDescending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy> {
		return this.toQuery().orderByDescending(sorter);
	}

	skip(count: number): Queryable<TModel, TQueryProxy> {
		return this.toQuery().skip(count);
	}

	limit(count: number): Queryable<TModel, TQueryProxy> {
		return this.toQuery().limit(count);
	}

	page(index: number, size?: number): Queryable<TModel, TQueryProxy> {
		return this.toQuery().page(index, size);
	}

	constructObject(raw: any, includes: QueryInclude<TModel, TQueryProxy>[]) {
		const model = new this.modelConstructor();

		for (let col in model.$meta.columns) {
			model[col] = raw[model.$meta.columns[col].name];
		}

		for (let include of includes) {
			for (let key in model) {
				const col = model[key];

				if (col instanceof ForeignReference && col.$column == include.relation.$column) {
					const innerRaw = {};

					for (let key in raw) {
						if (key.startsWith(include.prefix)) {
							innerRaw[key.replace(include.prefix, "")] = raw[key];
						}
					}

					col["$stored"] = new include.relation.$relation().$meta.set.constructObject(innerRaw, []);
				}
			}
		}

		return model;
	}
}