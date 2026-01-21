import { StoredProperty } from "../stored-property";
import { BaseDataType } from "./base";

export class Enum extends BaseDataType {
	static loadAsBlob = false;

	static sqlParameterTransform(parameterIndex: number, parameter: StoredProperty) {
		console.log('enum', parameterIndex, parameter);

		return `$${parameterIndex}::${parameter.type}`;
	}

	static toSQLParameter(parameter: StoredProperty) {
		return parameter.value;
	}

	static fromSQL(value: string) {
		return value;
	}
}
