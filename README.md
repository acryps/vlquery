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

## Database Structure

Every entity requires an `id` column of type `uuid`. You can use an integer, but it will be treated as a string.

### Naming
Postgres does not support uppercase letters in table and column names.
Use a `_` in a column or table name to make the next letter upper case in your models
```
CREATE TABLE book_price_group (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

	group_name TEXT
)
```

This will create a context which can be used like this
```
const group = new BookPriceGroup();
group.groupName = "Kids Books";
```

### References
Let's demonstrate a simple reference between an author and a book
```
CREATE TABLE person (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT
);

CREATE TABLE book (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	title TEXT
	
	author_id UUID CONSTRAINT **author__books** REFERENCES person (id)
);
```

This will create a context which with the references
```
const book = db.book.find(1);
const author = await book.**author**.fetch();

author.**books**.toArray();
```

You can use `_` in a references name to make it uppercase in the context

### Deactivate instead of delete
vlquery supports deactivating rows instead of deleting them. 
Let's demonstrate this feature with a column named `_active`.

First, add the following configuration to `vlquery.json`:
```
	"context": {
		**"active": "_active"**
		...
	}
```

This requires a column `_active` of type `boolean` in every entity in the database

```
CREATE TABLE book (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	**_active BOOLEAN DEFAULT true,**

	...
);
```