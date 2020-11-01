# Getting started
Before you can get started with vlquery, create a database on your postgres server.
We're using a database called "my_project" in this example.

Let's install the vlquery package
<pre>
npm install vlquery --save
</pre>

Now, let's create a vlquery configuration file `vlconfig.json` in your projects root
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
import { db } from "./context";
import { DbClient } from "vlquery";

DbClient.connectedClient = new DbClient({
	user: "postgres",
	password: ..., 
	database: "my_project"
});

DbClient.connectedClient.connect().then(async () => {
	const jonny = await db.person.first(item => item.firstname == "Jonny");

	console.log(jonny);

	jonny.pageVisits++;
	await jonny.update();
});
</pre>

This should return the first row in the entity 'person' with the firstname 'Jonny'.

Now make sure to swap your tsc build task with:
<pre>
tsc ; npx vlquery compile
</pre>

You're good to go!