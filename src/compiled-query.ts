
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
		stack: (string | {
			name: string,
			parameters: CompiledQuery[];
		})[];
	};

	value?: any;
}
