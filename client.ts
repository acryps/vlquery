import { Client } from "pg";
import { Config } from "../../config/config";

export class DbClient {
	static connectedClient: DbClient;
	
	connection: Client;

	constructor() {
		this.connection = new Client(Config.db);
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