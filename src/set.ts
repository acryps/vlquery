import { Queryable } from "./queryable";
import { Entity } from "./entity";
import { DbClient } from "./client";
import { QueryProxy } from "./query-proxy";
import { Query } from "./query";
import { ForeignReference, PrimaryReference, RunContext } from ".";
import { QueryColumnMapping } from "./query-operators/column-map";

export class DbSet<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> implements Queryable<TModel, TQueryProxy> {
	constructor(
		public modelConstructor: new () => TModel,
		public runContext?: RunContext
	) {}
	
	get $meta() {
		return new this.modelConstructor().$meta;
	}
	
	async create(item: TModel) {
		const properties = this.getStoredProperties(item);

		if (item.$meta.active) {
			properties.push({
				key: null,
				name: item.$meta.active,
				value: true,
				type: "boolean"
			});
		}

		const id = (await DbClient.query(`
		
			INSERT INTO ${item.$meta.tableName} (
				${properties.map(p => p.name)}
			) VALUES (
				${properties.map((p, i) => `$${i + 1}`)}
			) RETURNING id
		
		`, properties.map(p => p.value)))[0].id;

		item.id = id;

		return item;
	}

	async update(item: TModel) {
		if (!item.id) {
			throw new Error(`Cannot update entity, an id is required!`);
		}

		const properties = this.getStoredProperties(item);

		await DbClient.query(`
		
			UPDATE ${item.$meta.tableName} 
			SET ${properties.map((p, i) => `${p.name} = $${i + 2}`)}
			WHERE id = $1
		
		`, [
			item.id,
			...properties.map(p => p.value)
		]);

		return item;
	}

	async delete(item: TModel) {
		for (let key in item) {
			const column = item[key];

			if (key[0] == "$" && column instanceof PrimaryReference) {
				const count = await column.count;

				if (count) {
					throw new Error(`Cannot delete '${item.id}' from '${this.$meta.tableName}'. ${count} items from '${new column.$relation().$meta.tableName}' still reference it`);
				}
			}
		}

		if (item.$meta.active) {
			await DbClient.query(`
			
				UPDATE ${item.$meta.tableName} 
				SET _active = false
				WHERE id = $1
			
			`, [
				item.id
			]);
		} else {
			await DbClient.query(`
			
				DELETE FROM ${item.$meta.tableName} 
				WHERE id = $1
			
			`, [
				item.id
			]);
		}
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

	include(selector: (item: TModel) => any): Queryable<TModel, TQueryProxy> {
		return this.toQuery().include(selector);
	}

	includeTree(tree: any): Queryable<TModel, TQueryProxy> {
		return this.toQuery().includeTree(tree);
	}

	get count(): Promise<number> {
		return this.toQuery().count;
	}

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

	constructObject(raw: any, columnMappings: QueryColumnMapping<TModel, TQueryProxy>[], path: string[]) {
		const model = new this.modelConstructor();

		const columns = columnMappings.filter(
			c => c.path.length == path.length + 1 && !c.path.slice(0, c.path.length - 1).find((e, i) => path[i] != e)
		);

		for (let col in model.$meta.columns) {
			const map = columns.find(c => c.lastComponent == col);

			if (map) {
				model[col] = raw[map.name];
			}
		}

		for (let key in model) {
			const relation = model[key];

			if (relation instanceof ForeignReference && columnMappings.find(m => m.path[path.length] == key.replace("$", ""))) {
				// construct prefetched item
				const child = (new relation.$relation().$meta.set).constructObject(raw, columnMappings, [
					...path, 
					key.replace("$", "")
				]);

				// store prefetched item into private $stored variable
				// you should NEVER access this variable
				// use .fetch() instead!
				relation["$stored"] = child;
			}

			if (relation instanceof PrimaryReference && key in raw) {
				const set = (new relation.$relation()).$meta.set;

				const items = raw[key].map(item => set.constructObject(item, columnMappings, [
					...path,
					key
				]));

				// store prefetched result in private $stored variable
				// you should NEVER access this variable
				// use .fetch() instead!
				relation["$stored"] = items;
			}
		}

		return model;
	}
}