import { Pool } from "postgrejs";

export class DbClient {
	static connectedClient: DbClient;
	static reconnectInterval = 2000;
	static reconnecting = false;

	connection: Pool;
	connected: boolean;

	stalledRequests: StalledDbRequest[] = [];

	quertCount = 0;
	openQueryCount = 0;

	constructor(private configuration?) {}

	async connect() {
		// reset open connections
		this.connection?.close();

		console.log('connecting to database...');

		this.connection = new Pool({
			ssl: {
				rejectUnauthorized: false
			},

			min: this.configuration?.min ?? 1,
			max: this.configuration?.max ?? 8
		});

		this.connection.on('error', error => {
			console.warn('database connection failed', error);

			this.reconnect();
		});

		this.connection.on('terminate', () => this.reconnect());

		const probe = await this.connection.acquire();

		if (probe) {
			probe.close();
		}

		console.log('connected to database');

		this.connected = true;
	}

	reconnect() {
		this.connected = false;

		if (DbClient.reconnecting) {
			return;
		}

		DbClient.reconnecting = true;

		console.log(`reconnecting to database...`);

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

	async query(sql: string, params: any[]): Promise<any[]> {
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

		const queryNumber = ++this.quertCount;
		this.openQueryCount++;
		const start = +new Date();

		if (process.env.VLQUERY_LOG_SQL) {
			console.log(`query ${queryNumber}: ${query}`);
		}

		for (let name of names) {
			query = query.split(`@${name}`).join(`$${data.length + 1}`);

			data.push(params[name]);
		}

		try {
			const response = await this.connection.query(query, {
				params,
				fetchCount: (2 ** 32) - 1 // it does not fetch all rows if not specified
			});

			this.openQueryCount--;

			if (process.env.VLQUERY_LOG_SQL) {
				console.log(`query ${queryNumber}: ${+new Date() - start}ms, ${this.openQueryCount} open queries`);
			}

			return response.rows;
		} catch (error) {
			console.warn(`query ${queryNumber} failed`, error, sql);
			this.openQueryCount--;

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
