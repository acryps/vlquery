import fs = require("fs");
import path = require("path");

let rootFolder = process.cwd();

while (path.parse(rootFolder).root != rootFolder && !fs.existsSync(`${rootFolder}/vlconfig.json`)) {
	rootFolder = path.resolve(rootFolder, "..");
}

if (path.parse(rootFolder).root == rootFolder) {
	throw new Error(`No vlconfig.json configuration found in '${process.cwd()}'!`);
}

const userConfig = JSON.parse(fs.readFileSync(`${rootFolder}/vlconfig.json`).toString());

export const config = {
	root: rootFolder,
	context: {
		outFile: (userConfig.context && userConfig.context.outFile) || "db-context.ts",
		connection: (userConfig.context && userConfig.context.connection) || {},
		active: (userConfig.context && userConfig.context.active)
	},
	compile: {
		scan: (userConfig.compile && userConfig.compile.scan) || [
			"${tsout}",
		],
		methods: (userConfig.compile && userConfig.compile.methods) || [
			"where",
			"first",
			"count"
		],
		verbose: userConfig.compile ? ("verbose" in userConfig.compile ? userConfig.compile.verbose : false) : false
	}
};

// resolve ${tsout} in scanner settings
for (let scanner = 0; scanner < config.compile.scan.length; scanner++) {
	if (config.compile.scan[scanner].includes("${tsout}")) {
		let tsConfigRootFolder = process.cwd();

		while (path.parse(tsConfigRootFolder).root != tsConfigRootFolder && !fs.existsSync(`${tsConfigRootFolder}/tsconfig.json`)) {
			tsConfigRootFolder = path.resolve(tsConfigRootFolder, "..");
		}

		if (path.parse(tsConfigRootFolder).root == tsConfigRootFolder) {
			throw new Error(`No tsconfig.json configuration found in '${process.cwd()}' required to resolve '${config.compile.scan[scanner]}' in vlconfig.json!`);
		}

		const tsconfig = JSON.parse(fs.readFileSync(`${tsConfigRootFolder}/tsconfig.json`).toString());

		config.compile.scan[scanner] = config.compile.scan[scanner].replace("${tsout}", `${tsConfigRootFolder}/${tsconfig.compilerOptions.outDir}`);
	}
}