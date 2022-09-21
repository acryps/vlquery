import { QueryProxy } from ".";

export class View<TQueryProxy extends QueryProxy> {
	$$meta: {
		viewName: string,
		columns: {
			[key: string]: {
				name: string,
				type: string
			}
		} | any
	};
}