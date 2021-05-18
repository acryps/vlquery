import { BaseDataType } from "./base";
import { ByteArray } from "./byte-array";

export * from "./byte-array";

export const dataTypes: { [name: string]: typeof BaseDataType } = {
    bytea: ByteArray,

    text: BaseDataType,
	integer: BaseDataType,
	float: BaseDataType,
	real: BaseDataType,
	boolean: BaseDataType,
	uuid: BaseDataType,
	timestamp: BaseDataType,
	time: BaseDataType,
    date: BaseDataType,
    json: BaseDataType,
    jsonb: BaseDataType
};