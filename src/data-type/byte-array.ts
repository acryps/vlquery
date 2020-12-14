import { BaseDataType } from "./base";

export class ByteArray implements BaseDataType {
    static sqlParameterTransform(parameterIndex: number, value: Buffer) {
        if (!value) {
            return `$${parameterIndex}`;
        }

        return `VALUES(DECODE($${parameterIndex}::text, 'hex'))`;
    }

    static toSQLParameter(value: Buffer) {
        if (value) {
            return value.toString("hex");
        }
    }

    static fromSQL(value: string) {
        if (value) {
            return Buffer.from(value, "hex");
        }
    }
}