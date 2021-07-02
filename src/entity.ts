import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";
import { DbSet } from "./set";

export class Entity<TQueryProxy extends QueryProxy> {
	$$meta: {
		tableName: string,
		columns: {
			[key: string]: {
				name: string,
				type: string
			}
		} | any,
		set: DbSet<Entity<TQueryProxy>, TQueryProxy>,
		active?: string
	};

	// replicate foreign reference property $$item
	// this allows us to use Entity | ForeignReference<Entity> in the set accessor
	// while only keeping the ForeignReference<Entity> for the get accessor
	get $$item(): Entity<QueryProxy> { throw new Error("Cannot get $$item during runtime"); }

	id: string | number;

	async create(comment?: string): Promise<this> {
		return await this.$$meta.set.create(this, comment) as this;
	}

	async update(comment?: string): Promise<this> {
		return await this.$$meta.set.update(this, comment) as this;
	}

	async delete(comment?: string): Promise<void> {
		await this.$$meta.set.delete(this, comment);
	}
}