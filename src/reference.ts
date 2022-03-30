import { Entity } from "./entity";
import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";
import { Query } from ".";

export class ForeignReference<T extends Entity<QueryProxy>> {
	private $stored;
	private $fetched = false;
	
	constructor(
		public $$item: Entity<QueryProxy>,
		public $column?: string,
		public $relation?: new () => T
	) {}

	get id(): string | number {
		return this.$$item[this.$column];
	}

	set id(value: string | number) {
		if (this.$stored) {
			delete this.$stored;
		}

		this.$$item[this.$column] = value;
	}

	async fetch?(): Promise<T> {
		if (this.hasPrefetched) {
			return this.$stored;
		}

		const source = new this.$relation();
		
		return await source.$$meta.set.find(this.id) as T;
	}

	get hasPrefetched() {
		return this.$fetched;
	}
}

export class PrimaryReference<TSource extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> implements Queryable<TSource, TQueryProxy> {
	private $stored;
	private $fetched = false;
	
	constructor(
		public $$item: Entity<QueryProxy>,
		public $column: string,
		public $relation: new () => TSource
	) {}
	
	private toQuery() {
		const itemProxy = new this.$relation();

		return new Query(itemProxy.$$meta.set, [{
			compare: {
				operator: "=",
				left: { path: [ this.$column ] },
				right: { value: this.$$item.id }
			}
		}]) as unknown as Queryable<TSource, TQueryProxy>;
	}

	get hasPrefetched() {
		return this.$fetched;
	}

	where(query: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		return this.toQuery().where(query);
	}

	async first(query?: (item: TQueryProxy) => any): Promise<TSource> {
		return await this.toQuery().first(query);
	}

	async single(query?: (item: TQueryProxy) => any): Promise<TSource> {
		return await this.toQuery().single(query);
	}

	async toArray(): Promise<TSource[]> {
		// return prefetched result if there is one
		if (this.hasPrefetched) {
			return this.$stored;
		}

		return await this.toQuery().toArray();
	}

	include(selector: (item: TSource) => any): Queryable<TSource, TQueryProxy> {
		return this.toQuery().include(selector);
	}

	includeTree(tree: any): Queryable<TSource, TQueryProxy> {
		if (typeof tree != "function" && this.hasPrefetched) {
			// check if the whole tree has already been fetched
			if (this.isPrefetched(tree, this.$stored)) {
				// fake toArray-Method to return stored value
				const query = this.toQuery();

				query.toArray = () => {
					return this.$stored;
				};

				return query;
			}
		}

		return this.toQuery().includeTree(tree);
	}

	count(): Promise<number> {
		return this.toQuery().count();
	}

	orderByAscending(sorter: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		return this.toQuery().orderByAscending(sorter);
	}

	orderByDescending(sorter: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		return this.toQuery().orderByDescending(sorter);
	}

	skip(count: number): Queryable<TSource, TQueryProxy> {
		return this.toQuery().skip(count);
	}

	limit(count: number): Queryable<TSource, TQueryProxy> {
		return this.toQuery().limit(count);
	}

	page(index: number, size?: number): Queryable<TSource, TQueryProxy> {
		return this.toQuery().page(index, size);
	}

	private isPrefetched(tree, leaf) {
		let node = leaf;

		if (Array.isArray(leaf)) {
			if (leaf.length == 0) {
				return true;
			}

			node = leaf[0];
		}

		for (let key in tree) {
			// resolve references
			if (typeof tree[key] == "object") {
				if (node[key] && node[key].$stored) {
					if (!this.isPrefetched(tree[key], node[key].$stored)) {
						return false;
					}
				} else {
					return false;
				}
			} else {
				if (!(key in node)) {
					return false;
				}
			}
		}

		return true;
	}
}