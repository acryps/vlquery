import { Entity } from "./entity";
import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";
import { Query } from ".";

export class ForeignReference<T extends Entity<QueryProxy>> {
	private $stored;
	
	constructor(
		public $item: Entity<QueryProxy>,
		public $column?: string,
		public $relation?: new () => T
	) {}

	get id(): string {
		return this.$item[this.$column];
	}

	async fetch?() {
		if (this.$stored) {
			return this.$stored;
		}

		const source = new this.$relation();
		
		return await source.$meta.set.find(this.id) as T;
	}
}

export class PrimaryReference<TSource extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> implements Queryable<TSource, TQueryProxy> {
	constructor(
		public $item: Entity<QueryProxy>,
		public $column: string,
		public $relation: new () => TSource
	) {}

	private toQuery() {
		const itemProxy = new this.$relation();

		return new Query(itemProxy.$meta.set, [{
			compare: {
				operator: "=",
				left: { path: [ this.$column ] },
				right: { value: this.$item.id }
			}
		}]) as unknown as Queryable<TSource, TQueryProxy>;
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
		return await this.toQuery().toArray();
	}

	include(selector: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		return this.toQuery().include(selector);
	}

	count: Promise<number>;

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
}