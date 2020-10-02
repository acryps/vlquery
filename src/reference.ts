import { Entity } from "./entity";
import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";

export class ForeignReference<T extends Entity<QueryProxy>> {
	constructor(
		public $item: Entity<QueryProxy>,
		public $column?: string,
		public $relation?: new () => T
	) {}

	get id(): string {
		return this.$item[this.$column];
	}

	async fetch?() {
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

	where(query: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	first(query?: (item: TQueryProxy) => any): Promise<TSource> {
		throw new Error("Method not implemented.");
	}

	single(query?: (item: TQueryProxy) => any): Promise<TSource> {
		throw new Error("Method not implemented.");
	}

	toArray(): Promise<TSource[]> {
		throw new Error("Method not implemented.");
	}

	include(selector: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	count: Promise<number>;

	orderByAscending(sorter: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	orderByDescending(sorter: (item: TQueryProxy) => any): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	skip(count: number): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	limit(count: number): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}

	page(index: number, size?: number): Queryable<TSource, TQueryProxy> {
		throw new Error("Method not implemented.");
	}
}