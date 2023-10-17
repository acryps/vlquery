import { QueryProxy, ViewSet } from ".";

export class View<TQueryProxy extends QueryProxy> {
	$$meta: {
		source: string,
		set: ViewSet<View<TQueryProxy>, TQueryProxy>,

		columns: {
			[key: string]: {
				name: string,
				type: string
			}
		} | any
	};
}