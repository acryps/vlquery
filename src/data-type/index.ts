import { BaseDataType } from "./base";
import { ByteArray } from "./byte-array";
import { DateType } from "./date";

export * from "./byte-array";

export const dataTypes: { [name: string]: typeof BaseDataType } = {
    bytea: ByteArray,

    text: BaseDataType,
	int4: BaseDataType,
	integer: BaseDataType,
	float: BaseDataType,
	float4: BaseDataType,
	real: BaseDataType,
	bool: BaseDataType,
	boolean: BaseDataType,
	uuid: BaseDataType,
	timestamp: DateType,
	timestamptz: DateType,
	time: BaseDataType,
    date: DateType,
    json: BaseDataType,
    jsonb: BaseDataType
};