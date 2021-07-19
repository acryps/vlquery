import { BaseDataType } from "./base";

export class DateType implements BaseDataType {
    static fromSQL(value: string) {
        if (value) {
            return new Date(value);
        }
    }
}