import { BaseDataType } from "./base";
import { ByteArray } from "./byte-array";

export * from "./byte-array";

export const dataTypes: { [name: string]: typeof BaseDataType } = {
    bytea: ByteArray,

    text: BaseDataType,
	integer: BaseDataType,
	float: BaseDataType,
	real: BaseDataType,
	boolean: BaseDataType,
	uuid: BaseDataType,
	"timestamp without time zone": BaseDataType,
	"timestamp with time zone": BaseDataType,
	"time without time zone": BaseDataType,
	"time with time zone": BaseDataType,
    date: BaseDataType,
    json: BaseDataType,
    jsonb: BaseDataType
};