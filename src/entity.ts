import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";
import { DbSet } from "./set";

export class Entity<TQueryProxy extends QueryProxy> {
	$meta: {
		tableName: string,
		columns: {
			[key: string]: {
				name: string,
				type: string
			}
		},
		set: DbSet<Entity<TQueryProxy>, TQueryProxy>
	};

	// replicate foreign reference property $item
	// this allows us to use Entity | ForeignReference<Entity> in the set accessor
	// while only keeping the ForeignReference<Entity> for the get accessor
	get $item(): Entity<QueryProxy> { throw new Error("Cannot get $item during runtime"); }

	id: string;

	async create(): Promise<this> {
		return await this.$meta.set.create(this) as this;
	}

	async update(): Promise<this> {
		return await this.$meta.set.update(this) as this;
	}

	async delete(): Promise<this> {
		return await this.$meta.set.delete(this) as this;
	}
}