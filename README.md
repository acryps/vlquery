# vlquery TypeScript ORM
Simple to use TypeScript-Based ORM for postgres.

## Getting started
Before you can get started with vlquery, create a database on your postgres server.
We're using a database called "my_project" in this example.

Let's install the vlquery package
```
npm install vlquery --save
```

Now, let's create a vlquery configuration file `vlquery.json` in your projects root
```
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
```

The vlquery cli will help you create a database context from your existing database. To create and later on update your context, use the following command:
```
npx vlquery create-context
```

The context should be ready now. Use this small example program to get started
```
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
```

This should return the first row in the entity 'person' with the firstname 'Jonny'.

Now make sure to swap your tsc build task with:
```
tsc ; npx vlquery compile
```

You're good to go!