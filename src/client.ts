import { Client } from "pg";

export class DbClient {
	static connectedClient: DbClient;
	
	connection: Client;

	constructor(configuration?) {
		this.connection = new Client(configuration);
	}

	async connect() {
		await this.connection.connect();
	}

	async query(sql: string, params: any[]) {
		const names = Object.keys(params).sort().reverse();
		let data = [];

		for (let name of names) {
			sql = sql.split(`@${name}`).join(`$${data.length + 1}`);

			data.push(params[name]);
		}
		
		return (await this.connection.query(sql, params)).rows;
	}

	static async query(sql: string, params: any[]) {
		return this.connectedClient.query(sql, params);
	}
}