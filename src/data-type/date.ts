import { BaseDataType } from "./base";

export class DateType implements BaseDataType {
    static sqlParameterTransform(parameterIndex: number, value: any) {
        return `$${parameterIndex}`;
    } 

    static toSQLParameter(value: any) {
        return value;
    }
    
    static fromSQL(value: string) {
        if (value) {
            return new Date(value);
        }
    }
}