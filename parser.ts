import fs = require("fs");
import esprima = require("esprima");

const config = 

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

	function parseFilter(expression, itemParamName: string) {
		config.compile.verbose && console.log(`PARSE for ${itemParamName}: ${grab(expression)}`);
	
		if (expression.type == "LogicalExpression") {
			config.compile.verbose && console.group(`LINK ${expression.operator}`);
	
			const left = parseFilter(expression.left, itemParamName);
			const right = parseFilter(expression.right, itemParamName);
	
			config.compile.verbose && console.groupEnd();
	
			if (expression.operator == "&&") {
				return `{ and: { left: ${left}, right: ${right} } }`;
			} else if (expression.operator == "||") {
				return `{ or: { left: ${left}, right: ${right} } }`;
			} else {
				throw new Error(`Unknown logical operator '${expression.operator}'`)
			}
		} else if (expression.type == "BinaryExpression") {
			config.compile.verbose && console.group(`COMPARE ${expression.operator}`);
	
			const left = parseFilter(expression.left, itemParamName);
			const right = parseFilter(expression.right, itemParamName);
	
			config.compile.verbose && console.groupEnd();
	
			return `{ compare: { left: ${left}, right: ${right}, operator: ${JSON.stringify(expression.operator)} } }`;
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

				const parameters = expression.arguments.map(a => parseFilter(a, itemParamName));

				return `{ call: ${JSON.stringify(path)}, parameters: ${parameters} }`;
			}
		} else if (expression.type == "UnaryExpression" && expression.operator == "!") {
			return `{ not: ${parseFilter(expression.argument, itemParamName)} }`
		}

		return `{ value: ${grab(expression)} }`;
	}

	const filterTrees = [];

	esprima.parse(contents, { range: true }, (node, meta) => {
		if (node.type == "CallExpression") {
			// check if the call is directed towards first, where, ...
			if (node.callee.property && config.compile.methods.includes(node.callee.property.name)) {
				const filterType = node.callee.property.name;

				// fail if multiple filter functions are present
				if (node.arguments.length > 1) {
					throw new Error(`A ${filterType} call cannot contain more then one filter function`);
				}

				// only compile the filter function if there is one
				// example: first() does not require a filter function
				if (node.arguments.length == 1) {
					const filterFunction = node.arguments[0];

					// fail if an invalid amount of filter params are present
					if (filterFunction.params.length != 1) {
						throw new Error(`A ${filterType} call requires one parameter in its filter function`);
					}

					config.compile.verbose && console.group(`PARSE ${grab(filterFunction)}`);

					// filter tree
					const filterTree = parseFilter(filterFunction.body, filterFunction.params[0].name);

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
			compile(path);
		}
	}
}

scan(`${__dirname}/../../../server/dist`);