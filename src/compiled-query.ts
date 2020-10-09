
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
		to: string[];
		parameters: CompiledQuery[];
	};

	value?: any;
}
