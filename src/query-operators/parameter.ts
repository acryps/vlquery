import { Entity } from "../entity";
import { QueryProxy } from "../query-proxy";
import { Query } from "../query";
import { View } from "../view";
import { QueryEnum } from "../enum";

export class QueryParameter<TModel extends Entity<TQueryModel> | View<TQueryModel>, TQueryModel extends QueryProxy> {
	name: string;

	constructor(
		public query: Query<TModel, TQueryModel>,
		public value: any
	) {
		query.parameters.push(this);

		this.name = `$${query.parameters.length}`;
	}

	toParameterReference() {
		return this.name;
	}

	toParameterValue() {
		return this.value;
	}
}
