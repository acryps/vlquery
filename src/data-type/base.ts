export class BaseDataType {
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