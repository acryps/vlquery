import { Client } from "pg";

export class DbClient {
	static connectedClient: DbClient;
	static reconnectInterval = 2000;
	static reconnecting = false;
	
	connection: Client;
	connected: boolean;

	stalledRequests: StalledDbRequest[] = [];

	constructor(private configuration?) {}

	async connect() {
		this.connection = new Client(this.configuration);

		this.connection.on("error", () => this.reconnect());
		this.connection.on("end", () => this.reconnect());

		await this.connection.connect();

		this.connected = true;
	}

	reconnect() {
		this.connected = false;

		if (DbClient.reconnecting) {
			return
		}

		DbClient.reconnecting = true;

		console.log("reconnecting...");

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

				this.reconnect();
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
			return (await this.connection.query(query, params)).rows;
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