# vlquery TypeScript ORM
Simple to use TypeScript based database first ORM for postgres.

Here is a little example:
<pre>
const books = await db.book
	.where(book => book.author.firstname == "Jan")
	.orderByAscending(book => book.title)
	.toArray();

const author = await db.person.find("&lt;a very long uuid&gt;");
const authorsFirstBookFrom2001 = await author.books
	.first(book => book.publishedAt.year == 2001);

authorsFirstBookFrom2001.title = "A new title";
await authorsFirstBookFrom2001.update();
</pre>

## Getting started
[Complete Example Project](https://github.com/levvij/vlquery-example)

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

First, add the following configuration to `vlconfig.json`:
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

const authorsBooks = <b>await</b> author<b>.books.toArray()</b>;

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

### Limit, skip and paging
The bigger your database gets, the more important this will be.
<pre>
const books = await db.book.limit(3).skip(1).toArray();

const booksOnPage3 = await db.book.page(3).toArray(); // 0 = first page
const books51to100 = await db.book.page(1, 50).toArray();
</pre>

You can set the default page size by setting
<pre>
Qurey.defaultPageSize = 120;
</pre>

## Updating data
vlquery can save your data too!

### Creating records
Let's create a simple book with a refrence to its author
<pre>
const author = await db.author.find("&lt;uuid&gt;");

const book = new Book();
book.title = "My First Book!";
book.author = author;

await book.create();
</pre>

Alternatively to using `.author` you could do this:

<pre>
book.authorId = "&lt;uuid&gt;";
</pre>

vlquery will add the new id of your record to it, so after calling create, you'll be able to use the new id!

### Updating existing records
Whenever your data need some refreshing, do this:
<pre>
const book = await db.book.find("&lt;uuid&gt;");
book.title = "New Title";

await book.update();
</pre>

### Deleting a record
When your data is no longer required, it can be deleted with this code.
vlquery will check all references before you can delete the item!
<pre>
const book = await db.book.find("&lt;uuid&gt;");
await book.delete();
</pre>

If you are using an active column, this will only deactivate the row!

# Performance and Query Building
A common problem with ORMs is the performance. 
We try to improve every aspect of the query fetching focusing on reducing data consumption and speed.

Tests showed us that
```
SELECT book.title, person.firstname, person.lastname
FROM book 
INNER JOIN person ON person.id = book.author_id
```

is around 6% slower compared to

```
SELECT json_build_object(
	'title', book.title,
	'firstname', person.firstname,
	'lastname', person.lastname	
)
FROM book
INNER JOIN person ON person.id = book.author_id
```

We can get another 3% faster (local db, even bigger improvements for remote databases) by compressing the names.

```
SELECT json_build_object(
	'a', a.title,
	'b', b.firstname,
	'c', b.lastname	
) AS a
FROM book AS a
INNER JOIN person AS b ON b.id = a.author_id
```

`includeTree` calls are required to improve the performance.
Let's demonstrate the power of includes (using a include tree in this example):

```
await db.book.includeTree({
	"title": 1,
	"author": {
		"firstname": 1,
		"lastname": 1
	},
	"reviews": {
		"title": 1,
		"reviewer": {
			"firstname": 1,
			"lastname": 1,
			"books": {
				"title": 1
			}
		}
	}
}).toArray();
```

This will create the following SQL-Query (expanded for readability)
```
SELECT json_build_object(
	'0', ext1.firstname, 
	'1', ext1.lastname, 
	'2', ext1.id, 
	'9', ext0.title, 
	'a', ext0.published_at, 
	'b', ext0.id, 
	'reviews', ext2._
) AS _ 
FROM book AS ext0 
	INNER JOIN person AS ext1 ON ext0.author_id = ext1.id 
	LEFT JOIN ( 
		SELECT ext3.book_id, json_agg(json_build_object(
			'5', ext4.firstname, 
			'6', ext4.lastname, 
			'7', ext3.title, 
			'8', ext3.id, 
			'books', ext5._
		)) AS _ 
		FROM review AS ext3 
			INNER JOIN person AS ext4 ON ext3.reviewer_id = ext4.id 
			LEFT JOIN ( 
				SELECT ext6.author_id, json_agg(json_build_object(
					'3', ext6.title, 
					'4', ext6.id
				)) AS _ FROM book AS ext6 
			GROUP BY ext6.author_id 
		) AS ext5 ON ext4.id = ext5.author_id 
		GROUP BY ext3.book_id 
	) AS ext2 ON ext0.id = ext2.book_id
```