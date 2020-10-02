import fs = require("fs");

import { compileQueries } from "./parser";
import { createContext } from "./context-generator";

const args = process.argv.slice(2);

switch (args[0]) {
	case "create-context":
		createContext();

		break;

	case "compile":
		compileQueries();

		break;

	case "version":
		const config = JSON.parse(fs.readFileSync(`${__dirname}/../../package.json`).toString());

		console.log(`vlquery v${config.verison}`);

		break;

	default: {
		console.warn(`invalid command: ${args[0]}`);
		console.group();
		console.log("create-context: Create database context");
		console.log("compile: Compile queries in typescript dist");
		console.log("version: Print vlquery version");
		console.groupEnd();

		process.exit(1);
	}
}