import { QueryProxy } from "./query-proxy";
import { DbSet } from "./set";

// plain data, use a DatabaseContext to create, update or delete entities
export class Entity<TQueryProxy extends QueryProxy> {
	$$meta: {
		source: string,
		set: DbSet<Entity<TQueryProxy>, TQueryProxy>,
		
		columns: {
			[key: string]: {
				name: string,
				type: string
			}
		} | any,
		
		active?: string
	};

	// replicate foreign reference property $$item
	// this allows us to use Entity | ForeignReference<Entity> in the set accessor
	// while only keeping the ForeignReference<Entity> for the get accessor
	get $$item(): Entity<QueryProxy> { throw new Error("Cannot get $$item during runtime"); }

	id: string | number;
}
