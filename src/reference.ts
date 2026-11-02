import { Entity } from "./entity";
import { QueryProxy } from "./query-proxy";
import { DatabaseContextError } from "./database-context-error";
import { View } from "./view";

// reference to another entity, holds the id and the referenced entity if it has been included
// use DatabaseContext.fetch to load it from the database
export class ForeignReference<T extends Entity<QueryProxy> | View<QueryProxy>> {
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

	// returns the included entity
	async fetch?(): Promise<T> {
		if (this.hasPrefetched) {
			return this.$stored;
		}

		throw new DatabaseContextError(`Reference to '${new this.$relation().$$meta.source}' has not been included. Include it in the query or load it with database.fetch(reference)`);
	}

	get hasPrefetched() {
		return this.$fetched;
	}
}

// entities referencing an entity, holds the referencing entities if they have been included
// use DatabaseContext.related to query them from the database
export class PrimaryReference<TSource extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy> {
	private $stored;
	private $fetched = false;
	
	constructor(
		public $$item: Entity<QueryProxy>,
		public $column: string,
		public $relation: new () => TSource
	) {}

	get hasPrefetched() {
		return this.$fetched;
	}

	// returns the included entities
	async toArray(): Promise<TSource[]> {
		if (this.hasPrefetched) {
			return this.$stored;
		}

		throw new DatabaseContextError(`Reference to '${new this.$relation().$$meta.source}' has not been included. Include it in the query or query it with database.related(reference)`);
	}
}
