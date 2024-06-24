import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";
import { ForeignReference, PrimaryReference } from "./reference";
import { DbSet } from "./set";

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

	async create(comment?: string): Promise<this> {
		return await this.$$meta.set.create(this, comment) as this;
	}

	async update(comment?: string): Promise<this> {
		return await this.$$meta.set.update(this, comment) as this;
	}

	async delete(comment?: string): Promise<void> {
		await this.$$meta.set.delete(this, comment);
	}

	createDuplicate() {
		const copy = new this.$$meta.set.modelConstructor();
		copy.$$meta = this.$$meta;

		for (let key in this.$$meta.columns) {
			copy[key] = this[key];
		}

		delete copy.id;

		return copy as this;
	}
	
	// loads missing referenced data defined in the tree
	// 
	// will NOT load references missing on a deeper level
	// will NOT load fields, only references
	async backload(tree: any) {
		const tasks: Promise<void>[] = [];
		
		for (let property in tree) {
			if (property in this) {
				const reference = this[property];
				
				if (reference instanceof PrimaryReference) {
					if (!reference['$fetched']) {
						tasks.push(reference.includeTree(tree[property]).toArray().then(data => {
							reference['$stored'] = data;
							reference['$fetched'] = true;
						}));
					}
				} else if (reference instanceof ForeignReference) {
					if (!reference['$fetched']) {
						tasks.push(reference.sourceSet.includeTree(tree[property]).first(item => item.id == reference.id).then(data => {
							reference['$stored'] = data;
							reference['$fetched'] = true;
						}));
					}
				}
			}
		}
		
		await Promise.all(tasks);
	}
}
