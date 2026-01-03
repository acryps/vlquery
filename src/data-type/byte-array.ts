import { BaseDataType } from "./base";

export class ByteArray implements BaseDataType {
	static loadAsBlob = true;

    static sqlParameterTransform(parameterIndex: number, value: Buffer) {
        return `$${parameterIndex}`;
    }

    static toSQLParameter(value: Buffer) {
        if (value) {
            return value;
        }
    }

    static fromSQL(value: Buffer) {
        if (value) {
			return value;
        }
    }
}
