export class BaseDataType {
	static loadAsBlob = false;

    static sqlParameterTransform(parameterIndex: number, value: any) {
        return `$${parameterIndex}`;
    }

    static toSQLParameter(value: any) {
        return value;
    }

    static fromSQL(value: any) {
        return value;
    }
}
