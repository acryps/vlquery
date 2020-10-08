import fs = require("fs");
import esprima = require("esprima");
import { config } from "./config";

export function compileQueries() {
	function compile(path: string) {
		let contents = fs.readFileSync(path).toString();

		if (contents.trim().startsWith("// @vlquery ignore")) {
			return;
		}

		if (contents.trim().startsWith("// @vlquery parsed")) {
			console.warn(`ignoring already parsed file '${path}'`);

			return;
		}

		// gets original code from expressions range
		function grab(expression) {
			return contents.substr(
				expression.range[0],
				expression.range[1] - expression.range[0]
			)
		}

		function parseFilter(expression, itemParamName: string, content: string) {
			config.compile.verbose && console.log(`PARSE for ${itemParamName}: ${grab(expression)}`);
		
			if (expression.type == "LogicalExpression") {
				config.compile.verbose && console.group(`LINK ${expression.operator}`);
		
				const left = parseFilter(expression.left, itemParamName, content);
				const right = parseFilter(expression.right, itemParamName, content);
		
				config.compile.verbose && console.groupEnd();

				const operatorMappings = {
					"&&": "and",
					"||": "or"
				}

				const operator = operatorMappings[expression.operator];

				if (!operator) { 
					throw new Error(`Invalid logical operator '${expression.operator}' in '${content}'`);
				}
		
				return `{ logical: { left: ${left}, right: ${right}, operator: ${JSON.stringify(operator)} } }`;
			} else if (expression.type == "BinaryExpression") {
				config.compile.verbose && console.group(`COMPARE ${expression.operator}`);

				const operatorMappings = {
					"==": "=",
					"===": "=",
					"!=": "!=",
					"!==": "!=",
					"<": "<",
					">": ">",
					"<=": "<=",
					">=": ">="
				};
		
				const left = parseFilter(expression.left, itemParamName, content);
				const right = parseFilter(expression.right, itemParamName, content);

				const operator = operatorMappings[expression.operator];

				if (!operator) {
					throw new Error(`Invalid operator '${expression.operator}' in '${content}'`);
				}
		
				config.compile.verbose && console.groupEnd();
		
				return `{ compare: { left: ${left}, right: ${right}, operator: ${JSON.stringify(operator)} } }`;
			} else if (expression.type == "MemberExpression") {
				const path = [];
				let access = expression;
		
				while (access.object) {
					path.unshift(access.property.name);
		
					access = access.object;
				}
		
				path.unshift(access.name);
		
				if (path[0] == itemParamName) {
					config.compile.verbose && console.log(`MEMBER OR ITEM: ${path.join(" -> ")}`)

					return `{ path: ${JSON.stringify(path.slice(1))} }`;
				}
			} else if (expression.type == "CallExpression") {
				const path = [];
				let access = expression.callee;
		
				while (access.object) {
					path.unshift(access.property.name);
		
					access = access.object;
				}
		
				path.unshift(access.name);

				if (path[0] == itemParamName) {
					config.compile.verbose && console.log(`CALL '${path.join("' -> '")}'`);

					const parameters = expression.arguments.map(a => parseFilter(a, itemParamName, content));

					return `{ call: { to: ${JSON.stringify(path.slice(1))}, parameters: [${parameters}] } }`;
				}
			} else if (expression.type == "UnaryExpression") {
				if (expression.operator == "!") {
					throw new Error(`Operator ! is ambiguous: Use == null or == false.`);
				}

				throw new Error(`Invalid unary operator '${expression.operator}' in '${content}'.`);
			}

			return `{ value: ${grab(expression)} }`;
		}

		const filterTrees = [];

		esprima.parse(contents, { range: true }, (node, meta) => {
			if (node.type == "CallExpression") {
				// check if the call is directed towards first, where, ...
				if (node.callee.property && config.compile.methods.includes(node.callee.property.name)) {
					// only compile the filter function if there is one
					// example: first() does not require a filter function
					if (node.arguments.length == 1 && node.arguments[0].type == "ArrowFunctionExpression") {
						const filterFunction = node.arguments[0];

						// fail if an invalid amount of filter params are present
						if (filterFunction.params.length != 1) {
							throw new Error(`A ${node.callee.property.name} call requires one parameter in its filter function`);
						}

						config.compile.verbose && console.group(`PARSE ${grab(filterFunction)}`);

						// filter tree
						const filterTree = parseFilter(filterFunction.body, filterFunction.params[0].name, grab(filterFunction));

						config.compile.verbose && console.groupEnd();
						
						filterTrees.push({
							range: filterFunction.range,
							tree: filterTree
						});
					}
				}
			}
		});

		if (filterTrees.length) {
			let offset = 0;

			for (let tree of filterTrees) {
				contents = contents.substr(0, tree.range[0] - offset) + tree.tree + contents.substr(tree.range[1] - offset);

				offset += tree.range[1] - tree.range[0] - tree.tree.length;
			}

			fs.writeFileSync(path, `// @vlquery parsed\n${contents}`);
		}
	}

	function scan(directory: string) {
		for (let item of fs.readdirSync(directory)) {
			const path = `${directory}/${item}`;

			if (fs.lstatSync(path).isDirectory()) {
				scan(path);
			} else if (path.endsWith(".js")) {
				try {
					compile(path);
				} catch (e) {
					console.error(`Compiling of '${path}' failed!`, e);
				}
			}
		}
	}

	for (let dir of config.compile.scan) {
		scan(dir);
	}
}