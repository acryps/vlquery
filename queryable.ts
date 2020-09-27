import { Entity } from "./entity"
import { QueryProxy } from "./query-proxy";

export interface Queryable<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> {
	// query types
	where(query: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;
	first(query?: (item: TQueryProxy) => any): Promise<TModel>;
	last(query?: (item: TQueryProxy) => any): Promise<TModel>;
	single(query?: (item: TQueryProxy) => any): Promise<TModel>;

	// fetching
	toArray(): Promise<TModel[]>;
	include(selector: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;
	count: Promise<number>; 

	// ordering 
	orderByAscending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;
	orderByDescending(sorter: (item: TQueryProxy) => any): Queryable<TModel, TQueryProxy>;

	// paging
	skip(count: number): Queryable<TModel, TQueryProxy>;
	limit(count: number): Queryable<TModel, TQueryProxy>;
	page(index: number, size?: number): Queryable<TModel, TQueryProxy>;
}