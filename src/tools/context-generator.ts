import { Client } from "pg";
import * as fs from "fs";
import * as pathTools from "path";
import { config } from "../config";

export function createContext() {
	const client = new Client(config.context.connection);

	let enums = {};

	const getTypeMapping = type => {
		const types = {
			text: "string",
			int4: "number",
			integer: "number",
			bool: "boolean",
			boolean: "boolean",
			float: "number",
			float4: "number",
			float8: "number",
			real: "number",
			uuid: "string",
			timestamp: "Date",
			timestamptz: "Date",
			time: "Date",
			date: "Date",
			json: "any",
			jsonb: "any",
			bytea: "Buffer"
		}
		
		if (type in types) {
			return types[type];
		}

		if (type in enums) {
			return;
		}

		throw new Error(`Type '${type}' not found. Please report an issue at https://github.com/acryps/vlquery/issues`);
	}

	const proxyTypeMapping = {
		text: "QueryString",
		int4: "QueryNumber",
		integer: "QueryNumber",
		float: "QueryNumber",
		float4: "QueryNumber",
		real: "QueryNumber",
		bool: "QueryBoolean",
		boolean: "QueryBoolean",
		uuid: "QueryUUID",
		timestamp: "QueryTimeStamp",
		timestamptz: "QueryTimeStamp",
		time: "QueryTime",
		date: "QueryDate",
		json: "QueryJSON",
		jsonb: "QueryJSON",
		bytea: "QueryBuffer"
	};

	async function main() {
		await client.connect();
		config.compile.verbose && console.log("connected to database");

		function convertToModelName(name: string) {
			return name.replace(/\_[a-z]/g, m => m[1].toUpperCase());
		}

		function convertToClassName(name: string) {
			return name[0].toUpperCase() + convertToModelName(name.substr(1));
		}

		function convertToQueryProxyName(name: string) {
			return `${convertToClassName(name)}QueryProxy`;
		}

		function convertToViewClassName(name: string) {
			return `${convertToClassName(name)}View`;
		}

		function convertToViewQueryProxyClassName(name: string) {
			return `${convertToViewClassName(name)}Proxy`;
		}

		for (let row of (await client.query(`
			SELECT 
				t.typname as name, 
				e.enumlabel as value
			FROM pg_type t 
				JOIN pg_enum e ON t.oid = e.enumtypid  
				JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
		`)).rows) {
			if (row.name in enums) {
				enums[row.name].push(row.value);
			} else {
				enums[row.name] = [row.value];
			}
		}

		for (let name in enums) {
			enums[name] = enums[name].sort();
		}

		const tables = (await client.query(`
			SELECT tablename 
			FROM pg_tables
			WHERE schemaname = 'public'
			ORDER BY tablename
		`)).rows;

		let context = `
import { Entity, DbSet, RunContext, QueryUUID, QueryProxy, QueryString, QueryJSON, QueryTimeStamp, QueryNumber, QueryTime, QueryDate, QueryBoolean, QueryBuffer, QueryEnum, ForeignReference, PrimaryReference, View, ViewSet } from 'vlquery';
		`.trim() + "\n";
		let sets = [];

		// check if audit table exists
		if (config.context.audit) {
			if (!tables.find(t => convertToModelName(t.tablename) == config.context.audit.entity)) {
				throw new Error(`Cannot find audit table '${config.context.audit.entity}'. Check the spelling and be sure to use camel-case instead of '_' in vlconfig.json`);
			} 
		}

		for (let enumeration in enums) {
			context += `
export class ${convertToClassName(enumeration)} extends QueryEnum {
	${enums[enumeration].map(e => `static readonly ${convertToModelName(e)} = ${JSON.stringify(e)};`).join("\n\t")}
}
`;
		}

		for (let table of tables.map(t => t.tablename)) {
			config.compile.verbose && console.group(table);

			const columns = (await client.query(`
				SELECT 
					column_name,
					udt_name AS data_type
				FROM INFORMATION_SCHEMA.COLUMNS 
					WHERE table_name = $1${config.context.active ? ` AND column_name NOT IN ('${config.context.active}')`: ""}
				ORDER BY column_name
			`, [
				table
			])).rows;

			// check if all tracked properties extist in the audit table
			if (config.context.audit && convertToModelName(table) == config.context.audit.entity) {
				for (let column in config.context.audit.track) {
					if (!columns.find(c => convertToModelName(c.column_name) == column)) {
						throw new Error(`Cannot find tracked audit column '${column}' in audit table '${table}'. Check the spelling and be sure to use camel-case instead of '_' in vlconfig.json`);
					}
				}
			}

			const constraints = (await client.query(`
				SELECT 
					constraint_source.conname AS constraint_name,
					source_table.relname AS table_name,
					key_column.attname AS column_name,
					target_table.relname AS foreign_table_name,
					target_column.attname AS foreign_column_name
				FROM
					pg_constraint AS constraint_source
					
					JOIN pg_class source_table
						ON source_table.oid = constraint_source.conrelid
						
					JOIN pg_attribute key_column
						ON key_column.attnum = ANY(constraint_source.conkey)
							AND key_column.attrelid = constraint_source.conrelid
							AND NOT key_column.attisdropped
							
					JOIN pg_class target_table
						ON target_table.oid = constraint_source.confrelid
						
					JOIN pg_attribute target_column
						ON target_column.attnum = ANY(constraint_source.confkey)
							AND target_column.attrelid = constraint_source.confrelid
							AND NOT key_column.attisdropped
				WHERE
					constraint_source.contype = 'f'
					AND (source_table.relname = $1 OR target_table.relname = $1)
				ORDER BY constraint_name, table_name, foreign_table_name
			`, [table])).rows;

			let constr = '';
			let body = '';
			let shadowBody = '';
			let proxyBody = '';

			config.compile.verbose && console.group("constraints");

			for (let constraint of constraints) {
				config.compile.verbose && console.log(constraint.constraint_name);

				const parts = constraint.constraint_name.split("__");

				if (parts.length != 2) {
					throw new Error(`Invalid constraint name '${constraint.constraint_name}' from ${constraint.table_name}.${constraint.column_name} to ${constraint.foreign_table_name}.id`);
				} 

				if (constraint.table_name == table && parts[0]) {
					constr += `this.$${convertToModelName(parts[0])} = new ForeignReference<${
						convertToClassName(constraint.foreign_table_name)
					}>(this, ${
						JSON.stringify(convertToModelName(constraint.column_name))
					}, ${
						convertToClassName(constraint.foreign_table_name)
					});\n\t`;

					body += `get ${convertToModelName(parts[0])}(): Partial<ForeignReference<${
						convertToClassName(constraint.foreign_table_name)
					}>> { return this.$${
						convertToModelName(parts[0])
					}; }\n\t`

					shadowBody += `
	private $${convertToModelName(parts[0])}: ForeignReference<${convertToClassName(constraint.foreign_table_name)}>;

	set ${convertToModelName(parts[0])}(value: Partial<ForeignReference<${convertToClassName(constraint.foreign_table_name)}>>) {
		if (value) {
			if (!value.id) { throw new Error("Invalid null id. Save the referenced model prior to creating a reference to it."); }

			this.${convertToModelName(constraint.column_name)} = ${columns.find(c => c.column_name == "id").data_type == "uuid" ? "value.id as string" : "+value.id"};
		} else {
			this.${convertToModelName(constraint.column_name)} = null;
		}
	}
					`;

					proxyBody += `get ${
						convertToModelName(parts[0])
					}(): Partial<${
						convertToQueryProxyName(constraint.foreign_table_name)
					}> { throw new Error("Invalid use of QueryModels. QueryModels cannot be used during runtime"); }\n\t`;
				}
				
				if (constraint.foreign_table_name == table && parts[1]) {
					constr += `this.${convertToModelName(parts[1])} = new PrimaryReference<${
						convertToClassName(constraint.table_name)
					}, ${
						convertToQueryProxyName(constraint.table_name)
					}>(this, ${
						JSON.stringify(convertToModelName(constraint.column_name))
					}, ${convertToClassName(constraint.table_name)});\n\t\t`;

					body += `${convertToModelName(parts[1])}: PrimaryReference<${convertToClassName(constraint.table_name)}, ${convertToQueryProxyName(constraint.table_name)}>;\n\t\t`;
				}
			}

			config.compile.verbose && console.groupEnd();
			config.compile.verbose && console.group("columns");

			const columnMappings = {};

			for (let column of columns) {
				let type = getTypeMapping(column.data_type);
				let proxyType = proxyTypeMapping[column.data_type];

				if (column.data_type in enums) {
					type = convertToClassName(column.data_type);
				}
				
				if (!type) {
					throw new Error(`Unsupported column type '${column.data_type}' in column '${column.column_name}'`);
				}

				columnMappings[convertToModelName(column.column_name)] = {
					type: column.data_type,
					name: column.column_name
				};

				config.compile.verbose && console.log(column.column_name, column.data_type, type);

				body += `${column.column_name == 'id' ? 'declare ' : ''}${convertToModelName(column.column_name)}: ${type};\n\t`;
					
				if (column.column_name != "id") {
					proxyBody += `get ${
						convertToModelName(column.column_name)
					}(): ${
						column.data_type in enums ? enums[column.data_type].map(e => JSON.stringify(e)).join(" | ") : `Partial<${proxyType}>`
					} { throw new Error("Invalid use of QueryModels. QueryModels cannot be used during runtime"); }\n\t`;
				}
			}

			config.compile.verbose && console.groupEnd();

			context += `
export class ${convertToQueryProxyName(table)} extends QueryProxy {
	${proxyBody.trim()}
}

export class ${convertToClassName(table)} extends Entity<${convertToQueryProxyName(table)}> {
	${body.trim()}
	

	$$meta = {
		source: ${JSON.stringify(table)},

		columns: {
			${Object.keys(columnMappings).map(key => `${key}: { type: ${JSON.stringify(columnMappings[key].type)}, name: ${JSON.stringify(columnMappings[key].name)} }`).join(",\n\t\t\t")}
		},

		get set(): DbSet<${
			convertToClassName(table)
		}, ${
			convertToQueryProxyName(table)
		}> { 
			return new DbSet<${
				convertToClassName(table)
			}, ${
				convertToQueryProxyName(table)
			}>(${
				convertToClassName(table)
			}, null);
		}${config.context.active ? `,
		
		active: ${JSON.stringify(config.context.active)}` : ""}
	};${constr.trim() ? `
	
	constructor() {
		super();
		
		${constr.trim()}
	}` : ""}${shadowBody ? `
	
	${shadowBody}` : ""}
}
			`;

			sets.push({
				declaration: `${config.context.runContext ? "" : "static "}${convertToModelName(table)}: DbSet<${convertToClassName(table)}, ${convertToQueryProxyName(table)}>`,
				initialization: `${config.context.runContext ? `this.${convertToModelName(table)}` : ""} = new DbSet<${convertToClassName(table)}, ${convertToQueryProxyName(table)}>(${convertToClassName(table)}${config.context.runContext ? ", this.runContext" : ""});`
			});

			config.compile.verbose && console.groupEnd();
		}

		const viewSources = (await client.query(`
			SELECT viewname AS name
			FROM pg_views
			WHERE schemaname = 'public'
		`)).rows;

		const viewSets = [];

		for (let view of viewSources.map(view => view.name)) {
			const columns = (await client.query(`
				SELECT c.column_name AS name, c.udt_name AS type
				FROM information_schema.tables t LEFT JOIN information_schema.columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name
				WHERE table_type = 'VIEW' AND t.table_schema NOT IN ('information_schema', 'pg_catalog') AND t.table_name = $1
			`, [view])).rows;

			context += `
class ${convertToViewQueryProxyClassName(view)} extends QueryProxy {
	${columns.filter(column => column.name != 'id').map(column => `get ${
		convertToModelName(column.name)
	}(): Partial<${proxyTypeMapping[column.type]}> { throw new Error("Invalid use of QueryModels. QueryModels cannot be used during runtime"); }`).join('\n\t')}
}

export class ${convertToViewClassName(view)} extends View<${convertToViewQueryProxyClassName(view)}> {
	$$meta = {
		source: ${JSON.stringify(view)},
		get set(): ViewSet<${
			convertToViewClassName(view)
		}, ${
			convertToViewQueryProxyClassName(view)
		}> { 
			return new ViewSet<${
				convertToViewClassName(view)
			}, ${
				convertToViewQueryProxyClassName(view)
			}>(${
				convertToViewClassName(view)
			}, null);
		},

		columns: {
			${columns.map(column => `${convertToModelName(column.name)}: { type: ${JSON.stringify(column.type)}, name: ${JSON.stringify(column.name)} }`).join(",\n\t\t\t")}
		}
	};

	${columns.map(column => `${convertToModelName(column.name)}: ${getTypeMapping(column.type)};`).join('\n\t')}
}
			`;

			viewSets.push(`${convertToModelName(view)}: new ViewSet<${convertToViewClassName(view)}, ${convertToViewQueryProxyClassName(view)}>(${convertToViewClassName(view)})`);
		}

		if (config.context.audit) {
			context += `\n
DbSet.$audit = {
	table: ${JSON.stringify(config.context.audit.entity)},
	contextRequired: ${JSON.stringify(!!Object.keys(config.context.audit.track).find(key => Array.isArray(config.context.audit.track[key])))},
	commentRequired: ${JSON.stringify(!!config.context.audit.commentRequired)},

	async createAudit(action: "create" | "update" | "delete", comment: string, entity: Entity<any>, runContext?: any) {
		const audit = new ${convertToClassName(config.context.audit.entity)}();
		${Object.keys(config.context.audit.track).map(column => {
			const value = config.context.audit.track[column];
			let source = "";

			if (Array.isArray(value)) {
				// await all values just in case
				source = `${"await (".repeat(value.length - 1)}await runContext${value.map(v => `[${JSON.stringify(v)}]`).join(")")};`;
			} else if (value == "timestamp") {
				source = `new Date();`;
			} else if (value == "comment") {
				source = `comment;`;
			} else if (value == "action") {
				source = `action;`;
			} else if (value == "object") {
				return `
		const object = {};

		for (let key in entity.$$meta.columns) {
			object[key] = entity[key];
		}

		audit.${column} = object;
				`.trim();
			} else if (value == "entity") {
				source = `entity.$$meta.source;`;
			} else if (value == "id") {
				source = `entity.id.toString();`;
			}

			if (!source) {
				throw new Error(`Unknown tracked audit attribute '${value}'`);
			}

			return `audit.${column} = ${source}`;
		}).join("\n\t\t")}

		return audit;
	}
}
			`;
		}

		if (config.context.runContext) {
			context += `\n
export class DbContext {
	${sets.map(set => `${set.declaration};`).join("\n\t")}

	constructor(private runContext: RunContext) {
		${sets.map(set => set.initialization).join("\n\t\t")}
	}

	findSet(modelType) {
		for (let key in this) {
			if (this[key] instanceof DbSet) {
				if ((this[key] as any).modelConstructor == modelType) {
					return this[key];
				}
			}
		}
	}

	${viewSets.length ? `views = {
		${viewSets.join(',\n\t\t')}
	}` : ''}
};`;
		} else {
			context += `\n
export class db {
	${sets.map(set => `${set.declaration}${set.initialization}`).join("\n\t")}

	${viewSets.length ? `views = {
		${viewSets.join(',\n\t\t')}
	}` : ''}

	static findSet(modelType) {
		for (let key in this) {
			if (this[key] instanceof DbSet) {
				if ((this[key] as any).modelConstructor == modelType) {
					return this[key];
				}
			}
		}
	}
};`;
		}

		let missingPaths = [];
		let path = pathTools.join(config.root, config.context.outFile);

		while (!fs.existsSync(path = pathTools.dirname(path))) {
			missingPaths.push(path);
		}

		for (let path of missingPaths.reverse()) {
			fs.mkdirSync(path);
		}

		fs.writeFileSync(pathTools.join(config.root, config.context.outFile), context);
	}

	main().then(async () => {
		await client.end();

		process.exit(0);
	});
}