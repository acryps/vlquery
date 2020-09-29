import { compileQueries } from "./parser";
import { createContext } from "./context-generator";

const args = process.argv.slice(2);

if (args[0] == "create-context") {
	createContext();
} else if (args[0] == "compile") {
	compileQueries();
}