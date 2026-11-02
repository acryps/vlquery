# Getting started
Before you can get started with vlquery, create a database on your postgres server.
We're using a database called "my_project" in this example.

Let's install the vlquery package
<pre>
npm install vlquery --save
</pre>

Now, let's create a vlquery configuration file `vlconfig.json` in your projects root.
The connection is only used by the vlquery cli to read your databases structure, your application connects with its own `DbClient`
<pre>
{
	"context": {
		"outFile": "context.ts",
		"connection": {
			"user": "postgres",
			"password": ..., 
			"database": "my_project"
		}
	}
}
</pre>

The vlquery cli will help you create a database context from your existing database. To create and later on update your context, use the following command:
<pre>
npx vlquery create-context
</pre>

The context should be ready now. If you are using version control, commit it! 
Use this small example program to get started
<pre>
import { DbContext } from "./context";
import { DbClient } from "vlquery";

const client = new DbClient({
	user: "postgres",
	password: ..., 
	database: "my_project"
});

const db = new DbContext(client);

client.connect().then(async () => {
	const jonny = await db.person.first(item => item.firstname == "Jonny");

	console.log(jonny);

	jonny.pageVisits++;
	await db.update(jonny);
});
</pre>

This should return the first row in the entity 'person' with the firstname 'Jonny'.

Every database operation goes through the database context `db`, entities like `jonny` are plain data. 
See [Database context](database-context.md) for details and for working with multiple databases.

Now make sure to swap your tsc build task with:
<pre>
tsc ; npx vlquery compile
</pre>

You're good to go!