import { StoredProperty } from "../stored-property";

export class BaseDataType {
	static loadAsBlob = false;

	static sqlParameterTransform(parameterIndex: number, parameter: StoredProperty) {
		return `$${parameterIndex}`;
	}

	static toSQLParameter(parameter: StoredProperty) {
		return parameter.value;
	}

	static fromSQL(value: any) {
		return value;
	}
}
