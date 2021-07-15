
export interface CompiledQuery {
	compare?: {
		left: CompiledQuery;
		right: CompiledQuery;
		operator: "=" | "!=" | "<" | ">" | "<=" | ">=";
	};

	logical?: {
		left: CompiledQuery;
		right: CompiledQuery;
		operator: "and" | "or";
	};

	path?: string[];

	call?: {
		stack: (string | CompiledQueryCall)[];
	};

	value?: any;
}

export interface CompiledQueryCall {
	name: string;
	parameters: CompiledQuery[];
}