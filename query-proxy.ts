export class QueryProxy {
	id: string;
}

export class QueryType {
	isNull: boolean;
}

export class QueryString extends QueryType {
	valueOf(): string {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}

export class QueryNumber extends QueryType {
	valueOf(): number {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}

export class QueryBoolean extends QueryType {
	valueOf(): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}
}

export class QueryDate extends QueryType {
	valueOf(): Date {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isBefore(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isAfter(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	year: number;
	month: number;
	date: number;
}

export class QueryTime extends QueryType {
	valueOf(): Date {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	hour: number;
	minute: number;
	second: number;
	milisecond: number;
}

export class QueryTimeStamp extends QueryType {
	valueOf(): Date {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isBefore(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	isAfter(date: Date): boolean {
		throw "Invalid use of QueryTypes. QueryTypes cannot be used during runtime";
	}

	year: number;
	month: number;
	date: number;
	hour: number;
	minute: number;
	second: number;
	milisecond: number;
}

