import { Queryable } from "./queryable";
import { DbClient } from "./client";
import { QueryProxy } from "./query-proxy";
import { Query } from "./query";
import { ForeignReference, PrimaryReference, RunContext } from ".";
import { QueryColumnMapping } from "./query-operators/column-map";
import { Enum } from "./data-type/enum";
import { View } from "./view";
import { BlobExtent } from "./blob";
import { findDataType } from "./data-type";

export class ViewSet<TModel extends View<TQueryProxy>, TQueryProxy extends QueryProxy> implements Queryable<TModel, TQueryProxy> {
	constructor(
		public modelConstructor: new () => TModel,
		public runContext?: RunContext
	) {}

	get $$meta() {
		return new this.modelConstructor().$$meta;
	}

	async find(id: string | number) {
		return await this.first(item => item.id == id);
	}

	toQuery() {
		return new Query(this) as Queryable<TModel, TQueryProxy>;
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

	constructObject(base: any, columnMappings: QueryColumnMapping<TModel, TQueryProxy>[], path: string[], blobSource: any = [], blobFields: BlobExtent[] = []) {
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

		for (let columnName in model.$$meta.columns) {
			const map = columns.find(c => c.lastComponent == columnName);

			if (map) {
				const type = findDataType(map.type);

				if (type.loadAsBlob) {
					const blobIndex = blobFields.findIndex(externalField => externalField.column == columnName);

					model[columnName] = type.fromSQL(blobSource[blobIndex]);
				} else {
					model[columnName] = type.fromSQL(base[map.name]);
				}
			}
		}

		for (let key in model) {
			const relation = model[key];

			if (relation instanceof ForeignReference && columnMappings.find(m => m.path[path.length] == key.replace("$", ""))) {
				const idMapping = leaf.find(m => m.path[path.length] == key.replace("$", "") && m.path[path.length + 1] == "id");

				// check if id is null (empty relation target)
				if (idMapping && idMapping.name in base) {
					// construct prefetched item
					let child;

					if (base[idMapping.name]) {
						child = (new relation.$relation().$$meta.set).constructObject(base, columnMappings, [
							...path,
							key.replace("$", "")
						]);
					}

					// store prefetched item into private $stored variable
					// you should NEVER access this variable
					// use .fetch() instead!
					relation["$fetched"] = true;
					relation["$stored"] = child;
				} else {
					relation["$stored"] = null;
				}
			}

			if (relation instanceof PrimaryReference && key in base) {
				if (key in base) {
					const set = (new relation.$relation()).$$meta.set;

					const items = (base[key] || []).map(item => set.constructObject(item, columnMappings, [
						...path,
						key
					]));

					// store prefetched result in private $stored variable
					// you should NEVER access this variable
					// use .fetch() instead!
					relation["$fetched"] = true;
					relation["$stored"] = items;
				} else {
					relation["$stored"] = null;
				}
			}
		}

		return model;
	}
}
