# vlquery TypeScript ORM
Simple to use TypeScript-Based ORM for postgres.

## Getting started
Before you can get started with vlquery, create a database on your postgres server.
We're using a database called "my_project" in this example.

Let's install the vlquery package
<pre>
npm install vlquery --save
</pre>

Now, let's create a vlquery configuration file `vlquery.json` in your projects root
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

The context should be ready now. Use this small example program to get started
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

## Database Structure

Every entity requires an `id` column of type `uuid`. You can use an integer, but it will be treated as a string.

### Naming
Postgres does not support uppercase letters in table and column names.
Use a `_` in a column or table name to make the next letter upper case in your models
<pre>
CREATE TABLE <b>book_price_group</b> (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

	<b>group_name</b> TEXT
)
</pre>

This will create a context which can be used like this
<pre>
const group = new <b>BookPriceGroup</b>();
group.<b>groupName</b> = "Kids Books";
</pre>

### References
Let's demonstrate a simple reference between an author and a book
<pre>
CREATE TABLE person (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT
);

CREATE TABLE book (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	title TEXT
	
	author_id UUID CONSTRAINT <b>author__books</b> REFERENCES person (id)
);
</pre>

This will create a context which with the references
<pre>
const book = db.book.find(1);
const author = await book.<b>author</b>.fetch();

author.<b>books</b>.toArray();
</pre>

You can use `_` in a references name to make it uppercase in the context

### Deactivate instead of delete
vlquery supports deactivating rows instead of deleting them. 
References will be checked by the framework.
Let's demonstrate this feature with a column named `_active`.

First, add the following configuration to `vlquery.json`:
<pre>
	"context": {
		<b>"active": "_active"</b>
		...
	}
</pre>

This requires a column `_active` of type `boolean` in every entity in the database

<pre>
CREATE TABLE book (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	<b>_active BOOLEAN DEFAULT true,</b>

	...
);
</pre>

## Getting and filtering data
You can get data from the database using the `db` variable

<pre>
const book = await db.book.find("&lt;uuid&gt;");
const books = await db.book.toArray();
const authorCount = await db.authr.count;
</pre>

### Conditions
Throw in some conditions to filter the data

<pre>
const books = await db.book
	.where(book => book.title == "Test")
	.toArray();

// this will automatically join the author table and compare the value in there
const alicesBook = await db.book.first(book => book.author.firstname == "Alice");

// will fail if none or multiple items are found
const book = await db.book.single(book => book.title == "A Book");
</pre>

### Putting everyting into order
postgres can be very funny when it comes to the order of records in a table, so to make sure everyting is ordered properly, use the order by methods.
<pre>
const books = await db.book
	.orderByAscending(book => book.author.lastname)
	.orderByAscending(book => book.title)
	.toArray();
</pre>

### Resolving references
Relations in entities can be resolved like this:
<pre>
const book = await db.book.find("&lt;uuid&gt;");
const author = <b>await</b> book.author.<b>fetch()</b>;

const authorsBooks = await author.books.toArray();

const authorsBooksFrom2001 = await author.books
	.where(book => book.publishedAt.year == 2001) // add a condition
	.orderByAscending(book => book.title) // and an order
	.toArray();
</pre>

vlquery was designed to be as simple to use as Microsofts EntityFramework. 
Everybody who used Entity in a big project had to deal with the big implications that come with inexplicit lazy loading, thus we never implemented it into the framework. 
Every database access requires an await and thus reduces the chances of introducing performance issues.
If you want to prefetch certain items to improve performance, you can do it like this.
The `fetch`-call is still required!

<pre>
const books = await db.book
	<b>.include(book => book.author)</b> // preload authors
	.toArray();

for (let book of books) {
	const author = await book.author.fetch(); // this will resolve instantly
}
</pre>