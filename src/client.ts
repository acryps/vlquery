import { Client, Pool } from "pg";

export class DbClient {
	static connectedClient: DbClient;
	static reconnectInterval = 2000;
	static reconnecting = false;
	
	connection: Pool;
	connected: boolean;

	stalledRequests: StalledDbRequest[] = [];

	clients: Client[] = [];
	clientIndex: number = 0;

	constructor(private configuration?) {}

	async connect() {
		this.connection = new Pool(this.configuration);

		// reset open connections
		for (let client of this.clients) {
			client.release();
		}

		this.clients = [];
		this.clientIndex = 0;

		const count = this.configuration.max || 8;

		for (let index = 0; index < count; index++) {
			console.log(`connecting ${index + 1} / ${count}`);

			const connection = new DbClientConnection();
			connection.index = index;

			connection.client = await this.connection.connect();
			
			connection.client.on("error", () => this.reconnect(connection));
			connection.client.on("end", () => this.reconnect(connection));

			this.clients.push(connection);
		}

		this.connected = true;
	}

	reconnect(client: DbClientConnection) {
		this.connected = false;

		if (DbClient.reconnecting) {
			return;
		}

		DbClient.reconnecting = true;

		console.log(`reconnecting (#${client.index + 1})...`);

		this.connect().then(() => {
			DbClient.reconnecting = false;
			
			console.log(`reconnected, flushing ${this.stalledRequests.length} stalled requests`);

			while (this.stalledRequests.length) {
				const request = this.stalledRequests.pop();

				this.query(request.query, request.data).then(data => {
					request.oncomplete(data);
				});
			}
		}).catch(error => {
			console.warn("could not reconnect", error);

			setTimeout(() => {
				DbClient.reconnecting = false;

				this.reconnect(client);
			}, DbClient.reconnectInterval);
		});
	}

	async query(sql: string, params: any[]) {
		if (!this.connected) {
			const stalledRequest = new StalledDbRequest();
			stalledRequest.query = sql;
			stalledRequest.data = params;

			this.stalledRequests.push(stalledRequest);

			return new Promise(done => {
				stalledRequest.oncomplete = data => done(data);
			});
		}

		const names = Object.keys(params).sort().reverse();
		let data = [];
		let query = sql;

		if (process.env.VLQUERY_LOG_SQL) {
			console.log(query);
		}

		for (let name of names) {
			query = query.split(`@${name}`).join(`$${data.length + 1}`);

			data.push(params[name]);
		}

		try {
			this.clientIndex++;

			if (this.clientIndex >= this.clients.length) {
				this.clientIndex = 0;
			}

			return (await this.clients[this.clientIndex].client.query(query, params)).rows;
		} catch (error) {
			console.warn("query failed", error);

			if (this.connected) {
				throw error;
			} else {
				const stalledRequest = new StalledDbRequest();
				stalledRequest.query = sql;
				stalledRequest.data = params;

				this.stalledRequests.push(stalledRequest);

				return new Promise(done => {
					stalledRequest.oncomplete = data => done(data);
				});
			}
		}
	}

	static async query(sql: string, params: any[]) {
		return this.connectedClient.query(sql, params);
	}
}

export class StalledDbRequest {
	query: string;
	data: any[];

	oncomplete(res) {}
}

export class DbClientConnection {
	client: Client;

	index = 0;
}