import { BaseDataType } from "./base";
import { ByteArray } from "./byte-array";
import { DateDataType } from "./date";
import { Enum } from "./enum";

export * from "./byte-array";

const dataTypes: { [name: string]: typeof BaseDataType } = {
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
	timestamp: DateDataType,
	timestamptz: DateDataType,
	time: DateDataType,
	date: DateDataType,
	json: BaseDataType,
	jsonb: BaseDataType
};

export const findDataType = (type: string) => dataTypes[type] ?? Enum;
