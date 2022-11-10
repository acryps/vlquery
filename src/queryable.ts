import { Entity } from "./entity"
import { QueryProxy } from "./query-proxy";

export interface Queryable<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> {
	// query types
	where(query: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;
	first(query?: (item: TQueryProxy) => any): Promise<TModel | null>;
	single(query?: (item: TQueryProxy) => any): Promise<TModel | null>;

	// fetching
	toArray(): Promise<TModel[]>;
	count(): Promise<number>; 

	// selecting and prefetching
	include(selector: (item: TModel) => any): Queryable<TModel, TQueryProxy>;
	includeTree(tree: any): Queryable<TModel, TQueryProxy>;

	// ordering 
	orderByAscending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;
	orderByDescending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;

	// paging
	skip(count: number): Queryable<TModel, TQueryProxy>;
	limit(count: number): Queryable<TModel, TQueryProxy>;
	page(index: number, size?: number): Queryable<TModel, TQueryProxy>;
}