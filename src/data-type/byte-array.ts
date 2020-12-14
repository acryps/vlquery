import { BaseDataType } from "./base";

export class ByteArray implements BaseDataType {
    static sqlParameterTransform(parameterIndex: number, value: Buffer) {
        return `VALUES(DECODE($${parameterIndex}::text, 'hex'))`;
    }

    static toSQLParameter(value: Buffer) {
        return value.toString();
    }

    static fromSQL(value: string) {
        return Buffer.from(value, "hex");
    }
}