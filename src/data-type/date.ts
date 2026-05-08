import { BaseDataType } from "./base";

export class DateDataType extends BaseDataType {
	static fromSQL(value: any) {
		if (value == null || value instanceof Date) {
			return value;
		}

		if (typeof value == "string" && /^\d{2}:\d{2}:\d{2}/.test(value)) {
			return new Date(`1970-01-01T${value}Z`);
		}

		return new Date(value);
	}
}
