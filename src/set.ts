import { Queryable } from "./queryable";
import { Entity } from "./entity";
import { DbClient } from "./client";
import { QueryProxy } from "./query-proxy";
import { Query } from "./query";
import { ForeignReference, PrimaryReference, RunContext } from ".";
import { QueryColumnMapping } from "./query-operators/column-map";
import { dataTypes } from "./data-type";
import { BaseDataType } from "./data-type/base";
import { Enum } from "./data-type/enum";

export class DbSet<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> implements Queryable<TModel, TQueryProxy> {
	static $audit: {
		table: string;
		commentRequired: boolean;
		contextRequired: boolean;

		createAudit(action: "create" | "update" | "delete", comment: string, entity: Entity<any>, runContext?: any): Promise<Entity<any>>;
	}
	
	constructor(
		public modelConstructor: new () => TModel,
		public runContext?: RunContext
	) {}
	
	get $$meta() {
		return new this.modelConstructor().$$meta;
	}
	
	async create(item: TModel, comment?: string) {
		if (DbSet.$audit && DbSet.$audit.table != this.$$meta.tableName) {
			if (DbSet.$audit.commentRequired && !comment) {
				throw new Error("No audit comment for create set!");
			}

			if (DbSet.$audit.contextRequired && !this.runContext) {
				throw new Error(`Create called without a run context! Use the DbSet's create function`);
			}
		}

		const properties = this.getStoredProperties(item);

		if (item.$$meta.active) {
			properties.push({
				key: null,
				name: item.$$meta.active,
				value: true,
				type: "boolean"
			});
		}

		const id = (await DbClient.query(`INSERT INTO ${item.$$meta.tableName} ( ${
			properties.map(p => p.name)
		} ) VALUES ( ${
			properties.map((p, i) => (dataTypes[p.type] || Enum).sqlParameterTransform(i + 1, p.value))
		} ) RETURNING id`, properties.map(p => (dataTypes[p.type] || Enum).toSQLParameter(p.value))))[0].id;

		item.id = id;

		if (DbSet.$audit && DbSet.$audit.table != this.$$meta.tableName) {
			(await DbSet.$audit.createAudit("create", comment, item, this.runContext)).create();
		}

		return item;
	}

	async update(item: TModel, comment?: string) {
		if (!item.id) {
			throw new Error("Cannot update entity, an id is required!");
		}

		if (DbSet.$audit && DbSet.$audit.table != this.$$meta.tableName) {
			if (DbSet.$audit.commentRequired && !comment) {
				throw new Error("No audit comment for update set!");
			}

			if (DbSet.$audit.contextRequired && !this.runContext) {
				throw new Error(`Update called without a run context! Use the DbSet's update function`);
			}
		}

		const properties = this.getStoredProperties(item);

		await DbClient.query(`
		
			UPDATE ${item.$$meta.tableName} 
			SET ${properties.map((p, i) => `${p.name} = ${(dataTypes[p.type] || Enum).sqlParameterTransform(i + 2, p.value)}`)}
			WHERE id = $1
		
		`, [
			item.id,
			...properties.map(p => (dataTypes[p.type] || Enum).toSQLParameter(p.value))
		]);

		if (DbSet.$audit && DbSet.$audit.table != this.$$meta.tableName) {
			(await DbSet.$audit.createAudit("update", comment, item, this.runContext)).create();
		}

		return item;
	}

	async delete(item: TModel, comment?: string) {
		if (DbSet.$audit && DbSet.$audit.table != this.$$meta.tableName) {
			if (DbSet.$audit.commentRequired && !comment) {
				throw new Error("No audit comment for delete set!");
			}

			if (DbSet.$audit.contextRequired && !this.runContext) {
				throw new Error(`Delete called without a run context! Use the DbSet's delete function`);
			}
		}

		for (let key in item) {
			const column = item[key];

			if (key[0] == "$" && column instanceof PrimaryReference) {
				const count = await column.count();

				if (count) {
					throw new Error(`Cannot delete '${item.id}' from '${this.$$meta.tableName}'. ${count} items from '${new column.$relation().$$meta.tableName}' still reference it`);
				}
			}
		}

		if (item.$$meta.active) {
			await DbClient.query(`
			
				UPDATE ${item.$$meta.tableName} 
				SET _active = false
				WHERE id = $1
			
			`, [
				item.id
			]);
		} else {
			await DbClient.query(`
			
				DELETE FROM ${item.$$meta.tableName} 
				WHERE id = $1
			
			`, [
				item.id
			]);
		}

		if (DbSet.$audit && DbSet.$audit.table != this.$$meta.tableName) {
			(await DbSet.$audit.createAudit("delete", comment, item, this.runContext)).create();
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
			const col = item.$$meta.columns[key];

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

	async find(id: string | number) {
		return await this.first(item => item.id == id);
	}

	toQuery() {
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

	count(): Promise<number> {
		return this.toQuery().count();
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
		const leaf = [];

		for (let mapping of columnMappings) {
			let addMapping = true;

			for (let i = 0; i < path.length; i++) {
				if (path[i] != mapping.path[i]) {
					addMapping = false;
				}	
			}

			if (addMapping) {
				leaf.push(mapping);
			}
		}

		const columns = leaf.filter(c => c.path.length == path.length + 1);

		for (let col in model.$$meta.columns) {
			const map = columns.find(c => c.lastComponent == col);

			if (map) {
				model[col] = (dataTypes[map.type] || Enum).fromSQL(raw[map.name]);
			}
		}

		for (let key in model) {
			const relation = model[key];

			if (relation instanceof ForeignReference && columnMappings.find(m => m.path[path.length] == key.replace("$", ""))) {
				const idMapping = leaf.find(m => m.path[path.length] == key.replace("$", "") && m.path[path.length + 1] == "id");

				// check if id is null (empty relation target)
				if (idMapping && raw[idMapping.name]) {
					// construct prefetched item
					const child = (new relation.$relation().$$meta.set).constructObject(raw, columnMappings, [
						...path, 
						key.replace("$", "")
					]);

					// store prefetched item into private $stored variable
					// you should NEVER access this variable
					// use .fetch() instead!
					relation["$stored"] = child;
				} else {
					relation["$stored"] = null;
				} 
			}

			if (relation instanceof PrimaryReference && key in raw) {
				if (raw[key]) {
					const set = (new relation.$relation()).$$meta.set;

					const items = raw[key].map(item => set.constructObject(item, columnMappings, [
						...path,
						key
					]));

					// store prefetched result in private $stored variable
					// you should NEVER access this variable
					// use .fetch() instead!
					relation["$stored"] = items;
				} else {
					relation["$stored"] = null;
				}
			}
		}

		return model;
	}
}