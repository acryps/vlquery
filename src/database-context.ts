import { DbClient } from "./client";
import { DatabaseContextError } from "./database-context-error";
import { findDataType } from "./data-type";
import { Entity } from "./entity";
import { Query } from "./query";
import { QueryProxy } from "./query-proxy";
import { Queryable } from "./queryable";
import { ForeignReference, PrimaryReference } from "./reference";
import { RunContext } from "./run-context";
import { DbSet } from "./set";
import { StoredProperty } from "./stored-property";
import { ViewSet } from "./view-set";

// a connection to one database, all reads and writes go through a context
// entities are plain data and never remember where they have been loaded from
export class DatabaseContext {
	constructor(
		public $$client: DbClient,
		public $$runContext?: RunContext
	) {
		if (!$$client) {
			throw new DatabaseContextError("A database context requires a DbClient");
		}
	}

	// members are prefixed with $$ (except the public methods) to not collide with the generated sets named after the tables
	$$query(sql: string, params: any[]) {
		return this.$$client.query(sql, params);
	}

	// returns the set of this context for the model
	findSet<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy>(modelType: new () => TModel): DbSet<TModel, TQueryProxy> {
		for (let key in this) {
			const set = this[key];

			if (set instanceof DbSet && set.modelConstructor == modelType) {
				return set;
			}
		}

		return new DbSet<TModel, TQueryProxy>(modelType, this);
	}

	async create<TModel extends Entity<QueryProxy>>(item: TModel, comment?: string): Promise<TModel> {
		this.$$requireAuditContext(item, comment, "create");

		const properties = this.$$getStoredProperties(item);

		if (item.$$meta.active) {
			properties.push({
				key: null,
				name: item.$$meta.active,
				value: true,
				type: "boolean"
			});
		}

		const id = (await this.$$query(`INSERT INTO ${JSON.stringify(item.$$meta.source)} (${
			["id", ...properties.map(p => `"${p.name}"`)]
		}) VALUES (${
			["DEFAULT", ...properties.map((parameter, index) => findDataType(parameter.type).sqlParameterTransform(index + 1, parameter))]
		}) RETURNING id`, properties.map(parameter => findDataType(parameter.type).toSQLParameter(parameter))))[0][0];

		item.id = id;

		await this.$$audit("create", comment, item);

		return item;
	}

	async update<TModel extends Entity<QueryProxy>>(item: TModel, comment?: string): Promise<TModel> {
		if (!item.id) {
			throw new Error("Cannot update entity, an id is required!");
		}

		this.$$requireAuditContext(item, comment, "update");

		const properties = this.$$getStoredProperties(item);

		const updated = await this.$$query(`UPDATE ${JSON.stringify(item.$$meta.source)} SET ${properties.map(
			(parameter, index) => `"${parameter.name}" = ${findDataType(parameter.type).sqlParameterTransform(index + 2, parameter)}`
		)} WHERE id = $1 RETURNING id`, [
			item.id,
			...properties.map(parameter => findDataType(parameter.type).toSQLParameter(parameter))
		]);

		this.$$requireAffected(item, updated);

		await this.$$audit("update", comment, item);

		return item;
	}

	async delete<TModel extends Entity<QueryProxy>>(item: TModel, comment?: string): Promise<void> {
		if (!item.id) {
			throw new Error("Cannot delete entity, an id is required!");
		}

		this.$$requireAuditContext(item, comment, "delete");

		for (let key in item) {
			const column = item[key];

			if (key[0] == "$" && column instanceof PrimaryReference) {
				const count = await this.related(column).count();

				if (count) {
					throw new Error(`Cannot delete '${item.id}' from '${item.$$meta.source}'. ${count} items from '${new column.$relation().$$meta.source}' still reference it`);
				}
			}
		}

		let deleted;

		if (item.$$meta.active) {
			deleted = await this.$$query(`

				UPDATE ${JSON.stringify(item.$$meta.source)}
				SET ${JSON.stringify(item.$$meta.active)} = false
				WHERE id = $1
				RETURNING id

			`, [
				item.id
			]);
		} else {
			deleted = await this.$$query(`

				DELETE FROM ${JSON.stringify(item.$$meta.source)}
				WHERE id = $1
				RETURNING id

			`, [
				item.id
			]);
		}

		this.$$requireAffected(item, deleted);

		await this.$$audit("delete", comment, item);
	}

	// copies the stored values into a new, unsaved entity (without id)
	createDuplicate<TModel extends Entity<QueryProxy>>(item: TModel): TModel {
		const copy = new (item.constructor as new () => TModel)();

		for (let key in item.$$meta.columns) {
			copy[key] = item[key];
		}

		delete copy.id;

		return copy;
	}

	// loads the referenced entity, returns the prefetched entity if it has been included
	async fetch<TModel extends Entity<QueryProxy>>(reference: Partial<ForeignReference<TModel>>): Promise<TModel> {
		if (reference.hasPrefetched) {
			return reference['$stored'];
		}

		if (reference.id === null || reference.id === undefined) {
			return null;
		}

		return await this.findSet(reference.$relation).find(reference.id);
	}

	// query of all entities referencing the item
	related<TModel extends Entity<TQueryProxy>, TQueryProxy extends QueryProxy>(reference: PrimaryReference<TModel, TQueryProxy>): Queryable<TModel, TQueryProxy> {
		return new Query(this.findSet(reference.$relation), [{
			compare: {
				operator: "=",
				left: { path: [ reference.$column ] },
				right: { value: reference.$$item.id }
			}
		}]) as unknown as Queryable<TModel, TQueryProxy>;
	}

	// loads missing referenced data defined in the tree
	//
	// will NOT load references missing on a deeper level
	// will NOT load fields, only references
	async backload(item: Entity<QueryProxy>, tree: any) {
		const tasks: Promise<void>[] = [];

		for (let property in tree) {
			if (property in item) {
				const reference = item[property];

				if (reference instanceof PrimaryReference) {
					if (!reference.hasPrefetched) {
						tasks.push(this.related(reference).includeTree(tree[property]).toArray().then(data => {
							reference['$stored'] = data;
							reference['$fetched'] = true;
						}));
					}
				} else if (reference instanceof ForeignReference) {
					if (!reference.hasPrefetched) {
						tasks.push(this.findSet(reference.$relation as new () => Entity<QueryProxy>).includeTree(tree[property]).first(item => item.id == reference.id).then(data => {
							reference['$stored'] = data;
							reference['$fetched'] = true;
						}));
					}
				}
			}
		}

		await Promise.all(tasks);
	}

	// the database has to contain the row, an entity from another database (or a deleted one) will not be found
	private $$requireAffected(item: Entity<QueryProxy>, rows: any[]) {
		if (!rows.length) {
			throw new DatabaseContextError(`'${item.$$meta.source}' with id '${item.id}' does not exist in this database`);
		}
	}

	private $$isAudited(item: Entity<QueryProxy>) {
		return DbSet.$audit && DbSet.$audit.table != item.$$meta.source;
	}

	private $$requireAuditContext(item: Entity<QueryProxy>, comment: string, action: "create" | "update" | "delete") {
		if (this.$$isAudited(item)) {
			if (DbSet.$audit.commentRequired && !comment) {
				throw new Error(`No audit comment for ${action} set!`);
			}

			if (DbSet.$audit.contextRequired && !this.$$runContext) {
				throw new DatabaseContextError(`${action[0].toUpperCase()}${action.substring(1)} called on a database context without a run context!`);
			}
		}
	}

	// the audit is written into the same database as the audited item
	private async $$audit(action: "create" | "update" | "delete", comment: string, item: Entity<QueryProxy>) {
		if (this.$$isAudited(item)) {
			const audit = await DbSet.$audit.createAudit(action, comment, item, this.$$runContext);

			await this.create(audit);
		}
	}

	private $$getStoredProperties(item: Entity<QueryProxy>) {
		const properties: StoredProperty[] = [];

		for (let key in item) {
			const column = item.$$meta.columns[key];

			if (column) {
				properties.push({
					key,
					value: item[key],
					type: column.type,
					name: column.name
				});
			}
		}

		return properties;
	}
}
