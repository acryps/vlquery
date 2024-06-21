import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { Query } from "../query";
import { DbSet, ForeignReference, PrimaryReference } from "..";
import { QueryExtent } from "./extent";
import { QueryJoin } from "./join";
import { QueryColumnMapping } from "./column-map";
import { ViewSet } from "../view-set";
import { View } from "../view";

export class QueryInclude<TModel extends Entity<TQueryModel> | View<TQueryModel>, TQueryModel extends QueryProxy> {
	fetchTree: any;
	rootLeaf: QueryIncludeIndent<TModel, TQueryModel>;
	
	constructor(
		public query: Query<TModel, TQueryModel>,
		selectorOrTree: ((item: TQueryModel) => any) | any
	) {
		if (typeof selectorOrTree == "function") {
			const proxy = new query.set.modelConstructor();

			const parts = selectorOrTree.toString().split("=>");
			const itemParameter = parts[0].trim().replace(/\(|\)/g, "");
			const path = parts[1].replace(`${itemParameter}.`, "").trim().split(".");

			const tree = query.includeClause ? query.includeClause.fetchTree : {};
			let leaf = tree;
			let set = proxy;

			// add properties of root
			for (let key in proxy.$$meta.columns) {
				tree[key] = true;
			}

			// add referenced items
			for (let item of path) {
				const reference = new (set[item] as ForeignReference<TModel>).$relation();

				if (!leaf[item]) {
					leaf[item] = {};
				}

				for (let key in reference.$$meta.columns) {
					leaf[item][key] = true;
				}

				leaf = leaf[item];
				set = reference;
			}

			if (query.includeClause) {
				query.includeClause.fetchTree = tree;

				return query.includeClause as any;
			}

			return new QueryInclude<TModel, TQueryModel>(query, tree);
		} else {
			this.fetchTree = selectorOrTree;
		}
	}

	build(leaf, set: DbSet<Entity<QueryProxy>, QueryProxy> | ViewSet<View<QueryProxy>, QueryProxy>, extent: QueryExtent<Entity<QueryProxy>, QueryProxy> | QueryExtent<View<QueryProxy>, QueryProxy>, path: string[]) {
		const indent = new QueryIncludeIndent(this.query);
		const proxy = new set.modelConstructor();

		// add id to check for null relations
		if ("id" in leaf) {
			leaf.id = true;
		} 

		for (let property in leaf) {
			if (set.$$meta.columns[property]) {
				const col = set.$$meta.columns[property];

				const node = new QueryIncludeNode();
				node.name = col.name;
				node.extent = extent;
				node.to = new QueryColumnMapping(this.query, [
					...path, 
					property
				], col.type)

				indent.properties.push(node);
			} else if (proxy[property] && proxy[property] instanceof ForeignReference) {
				let targetExtent: QueryJoin<TModel, TQueryModel>;
				const reference = proxy[property] as ForeignReference<TModel>;
				const meta = (new reference.$relation()).$$meta;

				// only search for extisting join if on the first level
				if (extent == this.query.rootExtent) {
					const join = this.query.joins.find(j => j.table == meta.source && j.column == proxy.$$meta.columns[reference.$column].name);

					if (join) {
						targetExtent = join;
					}
				}

				if (!targetExtent) {
					// create new join
					targetExtent = new QueryJoin(
						this.query, 
						extent, 
						meta.source, 
						proxy.$$meta.columns[reference.$column].name
					);

					// remove the join form the root joins and add it to the indents joins
					if (extent != this.query.rootExtent) {
						this.query.joins.pop();

						indent.joins.push(targetExtent);
					}
				}

				indent.merge(this.build(leaf[property], meta.set, targetExtent.extent, [...path, property]));
			} else if (proxy[property] && proxy[property] instanceof PrimaryReference) {
				const reference = proxy[property] as PrimaryReference<Entity<TQueryModel>, TQueryModel>;
				const relation = new reference.$relation();

				const group = new QueryIncludeIndentGroup();
				group.mappedName = property;
				group.parentExtent = extent;
				group.exportingExtent = new QueryExtent(this.query);
				group.innerExtent = new QueryExtent(this.query);
				group.groupedColumn = relation.$$meta.columns[reference.$column].name;
				group.sourceTable = relation.$$meta.source;
				group.indent = this.build(leaf[property], relation.$$meta.set, group.innerExtent, [...path, property]);

				indent.childIndents.push(group);
			}
		}

		return indent;
	}

	buildMap() {
		this.rootLeaf = this.build(this.fetchTree, this.query.set, this.query.rootExtent, []);
	}

	toSelectSQL() {
		return this.rootLeaf.toSelectSQL();
	}

	toJoinSQL() {
		return this.rootLeaf.toJoinSQL();
	}
}

class QueryIncludeIndent<TModel extends Entity<TQueryModel> | View<TQueryModel>, TQueryModel extends QueryProxy> {
	properties: QueryIncludeNode<TModel, TQueryModel>[] = [];
	joins: QueryJoin<TModel, TQueryModel>[] = [];
	childIndents: QueryIncludeIndentGroup<TModel, TQueryModel>[] = [];

	constructor(public query: Query<TModel, TQueryModel>) {}

	merge(indent: QueryIncludeIndent<TModel, TQueryModel>) {
		this.properties.push(...indent.properties);
		this.joins.push(...indent.joins);
		this.childIndents.push(...indent.childIndents);
	}

	toSelectSQL() {
		let select = [];

		for (let property of this.properties) {
			select.push(`'${property.to.name}', ${property.extent.name}.${property.name}`);
		}

		for (let child of this.childIndents) {
			select.push(`'${child.mappedName}', ${child.exportingExtent.name}._`);
		}
		
		// postgres can only take 100 parameters (default)
		// split parameters after 10 selects to be sure
		const parts = [];
		
		while (select.length) {
			const part = select.splice(0, 10);
			
			parts.push(`json_build_object(${part.join(", ")})`);
		}

		return `(${parts.join(' || ')})`;
	}

	toJoinSQL() {
		const joins = [];

		for (let child of this.childIndents) {
			joins.push(`LEFT JOIN ( SELECT ${child.innerExtent.name}.${child.groupedColumn}, json_agg(${child.indent.toSelectSQL()}) AS _ FROM ${JSON.stringify(child.sourceTable)} AS ${child.innerExtent.name} ${child.indent.joins.map(j => j.toSQL()).join(" ")} ${child.indent.toJoinSQL()}${this.query.set instanceof DbSet && this.query.set.$$meta.active ? ` WHERE ${child.innerExtent.name}.${this.query.set.$$meta.active}` : ""} GROUP BY ${child.innerExtent.name}.${child.groupedColumn} ) AS ${child.exportingExtent.name} ON ${child.parentExtent.name}.id = ${child.exportingExtent.name}.${child.groupedColumn}`);
		}

		return joins.join("\n");
	}
}

class QueryIncludeIndentGroup<TModel extends Entity<TQueryModel> | View<TQueryModel>, TQueryModel extends QueryProxy> {
	exportingExtent: QueryExtent<TModel, TQueryModel>;
	innerExtent: QueryExtent<TModel, TQueryModel>;
	parentExtent: QueryExtent<TModel, TQueryModel>;

	groupedColumn: string;
	mappedName: string;
	sourceTable: string;

	indent: QueryIncludeIndent<TModel, TQueryModel>;
}

class QueryIncludeNode<TModel extends Entity<TQueryModel> | View<TQueryModel>, TQueryModel extends QueryProxy> {
	name: string;
	extent: QueryExtent<TModel, TQueryModel>;
	to: QueryColumnMapping<TModel, TQueryModel>;
}
