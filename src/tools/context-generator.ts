import { Client } from "pg";
import * as fs from "fs";
import * as pathTools from "path";
import { config } from "../config";

export function createContext() {
	const client = new Client(config.context.connection);

	const typeMapping = {
		text: "string",
		integer: "number",
		boolean: "boolean",
		float: "number",
		real: "number",
		uuid: "string",
		"timestamp without time zone": "Date",
		"time without time zone": "Date",
		date: "Date",
		json: "any"
	};

	const proxyTypeMapping = {
		text: "QueryString",
		integer: "QueryNumber",
		boolean: "QueryBoolean",
		uuid: "QueryUUID",
		"timestamp without time zone": "QueryTimeStamp",
		"time without time zone": "QueryTime",
		date: "QueryDate",
		json: "QueryJSON"
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

		const tables = (await client.query(`
			SELECT tablename 
			FROM pg_tables
			WHERE schemaname = 'public'
		`)).rows;

		let context = `
import { 
	Entity,
	DbSet,
	RunContext,
	QueryUUID,
	QueryProxy,
	QueryString,
	QueryJSON,
	QueryTimeStamp,
	QueryNumber,
	QueryTime,
	QueryDate,
	ForeignReference,
	PrimaryReference
} from "vlquery";
		`.trim() + "\n";
		let sets = [];

		// check if audit table exists
		if (config.context.audit) {
			if (!tables.find(t => convertToModelName(t.tablename) == config.context.audit.entity)) {
				throw new Error(`Cannot find audit table '${config.context.audit.entity}'. Check the spelling and be sure to use camel-case instead of '_' in vlconfig.json`);
			} 
		}

		for (let table of tables.map(t => t.tablename)) {
			config.compile.verbose && console.group(table);

			const columns = (await client.query(`
				SELECT 
					column_name,
					data_type
				FROM INFORMATION_SCHEMA.COLUMNS 
					WHERE table_name = $1${config.context.active ? ` AND column_name NOT IN ('${config.context.active}')`: ""}
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
					tc.constraint_name, 
					tc.table_name, 
					kcu.column_name, 
					ccu.table_name AS foreign_table_name,
					ccu.column_name AS foreign_column_name 
				FROM  information_schema.table_constraints AS tc 
					JOIN information_schema.key_column_usage AS kcu
						ON tc.constraint_name = kcu.constraint_name
					JOIN information_schema.constraint_column_usage AS ccu
					ON ccu.constraint_name = tc.constraint_name
				WHERE constraint_type = 'FOREIGN KEY' AND (tc.table_name = $1 OR ccu.table_name = $1)
			`, [table])).rows;

			let constr = ``;
			let body = ``;
			let proxyBody = ``;

			config.compile.verbose && console.group("constraints");

			for (let constraint of constraints) {
				config.compile.verbose && console.log(constraint.constraint_name);

				const parts = constraint.constraint_name.split("__");

				if (constraint.table_name == table) {
					constr += `
		this.$${convertToModelName(parts[0])} = new ForeignReference<${convertToClassName(constraint.foreign_table_name)}>(
			this,
			${JSON.stringify(convertToModelName(constraint.column_name))},
			${convertToClassName(constraint.foreign_table_name)}
		);
					`;

					body += `
	private $${convertToModelName(parts[0])}: ForeignReference<${convertToClassName(constraint.foreign_table_name)}>;

	get ${convertToModelName(parts[0])}(): Partial<ForeignReference<${convertToClassName(constraint.foreign_table_name)}>> {
		return this.$${convertToModelName(parts[0])};
	}

	set ${convertToModelName(parts[0])}(value: Partial<ForeignReference<${convertToClassName(constraint.foreign_table_name)}>>) {
		if (value) {
			if (!value.id) {
				throw new Error("Invalid null id. Save the referenced model prior to creating a reference to it.");
			}

			this.${convertToModelName(constraint.column_name)} = value.id;
		} else {
			this.${convertToModelName(constraint.column_name)} = null;
		}
	}
					`;

					proxyBody += `
	get ${convertToModelName(parts[0])}(): Partial<${convertToQueryProxyName(constraint.foreign_table_name)}> {
		throw new Error("Invalid use of QueryModels. QueryModels cannot be used during runtime");
	}
					`;
				} else {
					constr += `
		this.${convertToModelName(parts[1])} = new PrimaryReference<${convertToClassName(constraint.table_name)}, ${convertToQueryProxyName(constraint.table_name)}>(
			this,
			${JSON.stringify(convertToModelName(constraint.column_name))},
			${convertToClassName(constraint.table_name)}
		);
					`;

					body += `
	${convertToModelName(parts[1])}: PrimaryReference<${convertToClassName(constraint.table_name)}, ${convertToQueryProxyName(constraint.table_name)}>;
					`;
				}
			}

			config.compile.verbose && console.groupEnd();

			body += "\n\t";

			config.compile.verbose && console.group("columns");

			const columnMappings = {};

			for (let column of columns) {
				const type = typeMapping[column.data_type];
				const proxyType = proxyTypeMapping[column.data_type];

				if (!type || !proxyType) {
					throw new Error(`Unsupported column type '${column.data_type}'`);
				}

				columnMappings[convertToModelName(column.column_name)] = {
					type: column.data_type,
					name: column.column_name
				};

				config.compile.verbose && console.log(column.column_name, column.data_type, type);

				if (column.column_name != "id") {
					body += `${convertToModelName(column.column_name)}: ${type};\n\t`;
					
					proxyBody += `
	get ${convertToModelName(column.column_name)}(): ${proxyType} {
		throw new Error("Invalid use of QueryModels. QueryModels cannot be used during runtime");
	}
				`;
				}
			}

			config.compile.verbose && console.groupEnd();

			context += `
export class ${convertToQueryProxyName(table)} extends QueryProxy {
	${proxyBody.trim()}
}

export class ${convertToClassName(table)} extends Entity<${convertToQueryProxyName(table)}> {
	$meta = {
		tableName: ${JSON.stringify(table)},
		columns: ${JSON.stringify(columnMappings)},
		get set() {
			// returns unbound dbset
			return new DbSet<${convertToClassName(table)}, ${convertToQueryProxyName(table)}>(${convertToClassName(table)}, null)
		},
		${config.context.active ? `active: ${JSON.stringify(config.context.active)}` : ""}
	};
		
	constructor() {
		super();

		${constr.trim()}
	}

	${body.trim()}
}
			`;

			sets.push(`${config.context.runContext ? "" : "static "}${convertToModelName(table)}: DbSet<${convertToClassName(table)}, ${convertToQueryProxyName(table)}> = new DbSet<${convertToClassName(table)}, ${convertToQueryProxyName(table)}>(${convertToClassName(table)}${config.context.runContext ? ", this.runContext" : ""});`);

			config.compile.verbose && console.groupEnd();
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

		for (let key in entity.$meta.columns) {
			object[key] = entity[key];
		}

		audit.${column} = object;
				`.trim();
			} else if (value == "entity") {
				source = `entity.$meta.tableName;`;
			} else if (value == "id") {
				source = `entity.id;`;
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
	constructor(private runContext: RunContext) {}

	${sets.join("\n\t")}
};`;
		} else {
			context += `\n
export class db {
	${sets.join("\n\t")}
};`;
		}

		let missingPaths = [];
		let path = pathTools.join(config.root, config.context.outFile);

		while (!fs.existsSync(path)) {
			missingPaths.push(path);

			path = pathTools.basename(path);
		}

		for (let path of missingPaths) {
			fs.mkdirSync(path);
		}

		fs.writeFileSync(pathTools.join(config.root, config.context.outFile), context);
	}

	main().then(async () => {
		await client.end();

		process.exit(0);
	});
}