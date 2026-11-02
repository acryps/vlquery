# Getting and filtering data
You can get data from the database using the sets of your database context `db` (see [Database context](database-context.md))

<pre>
const book = await db.book.find("&lt;uuid&gt;");
const books = await db.book.toArray();
const authorCount = await db.author.count();
</pre>

## Conditions
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

Columns can be filtered with functions ([Full function list](functions.md))
<pre>
// case insensitive title matching
await db.book.where(book => book.title<b>.lowercase()</b> == "test").toArray();

// searching for books by title (case insensitive)
await db.book.where(book => book.title<b>.lowercase().startsWith("tes")</b>).toArray();

// searching for autobios by searching for books with the authors name in their title
await db.book.where(book => book.title<b>.uppercase().includes(book.author.firstname.uppercase())</b>).toArray();
</pre>

## Putting everyting into order
postgres can be very funny when it comes to the order of records in a table, so to make sure everyting is ordered properly, use the `orderBy` methods.
<pre>
const books = await db.book
	.orderByAscending(book => book.author.lastname)
	.orderByAscending(book => book.title)
	.toArray();
</pre>

If your ordering column contains NULLs and you want a fallback sorting column, use `||`
<pre>
// some books do not have a release date yet, so we'll use the planned date instead!
const books = await db.book
	.orderByDescending(book => book.releaseDate<b> || book.plannedReleaseDate</b>)
	.toArray();
</pre>

You can use the afformentioned query functions for sorting! ([Full function list](functions.md))
<pre>
// case insensitive title sorting
const books = await db.book
	.orderByDescending(book => book.title<b>.lowercase()</b>)
	.toArray();
</pre>

## Resolving references
Entities are plain data. A reference never loads anything by itself, it only holds what has been included in the query.
Every database access is an explicit, awaited call on the database context.

### Loading references from the database
Pass the reference to the database context
<pre>
const book = await db.book.find("&lt;uuid&gt;");

// foreign reference (book -> author)
const author = <b>await db.fetch(</b>book.author<b>)</b>;

// primary reference (author -> books), returns a query
const authorsBooks = <b>await db.related(</b>author.books<b>).toArray()</b>;

const authorsBooksFrom2001 = await db.related(author.books)
	.where(book => book.publishedAt.year == 2001) // add a condition
	.orderByAscending(book => book.title) // and an order
	.toArray();

const bookCount = await db.related(author.books).count();
</pre>

`db.fetch` returns `null` if the reference is empty (the id is `null`).
`db.related` returns a regular query, everything from this page can be used on it, including `include`.

### Reading included references
References included in the query can be read from the entity directly, without a database context.
This reduces the number of queries, see [Performance and include](performance-and-include.md).
<pre>
const books = await db.book
	<b>.include(book => book.author)</b> // preload authors
	.toArray();

for (let book of books) {
	const author = await book.author.fetch(); // resolves instantly, no query
}

const authors = await db.author
	<b>.include(author => author.books)</b>
	.toArray();

const authorsBooks = await authors[0].books.toArray(); // resolves instantly, no query
</pre>

`book.author.fetch()` and `author.books.toArray()` throw a `DatabaseContextError` if the reference has not been included.
Use `hasPrefetched` to check if a reference has been included
<pre>
const author = book.author.hasPrefetched ? await book.author.fetch() : await db.fetch(book.author);
</pre>

`db.fetch` returns included references too, without running a query. If you're not sure if a reference has been included, use `db.fetch`.

### Loading missing references
`backload` loads all references in the tree which have not been included yet
<pre>
const book = await db.book.find("&lt;uuid&gt;");

await db.backload(book, {
	author: { firstname: true },
	reviews: { title: true }
});

const author = await book.author.fetch(); // resolves instantly
</pre>

Only the references on the first level are loaded, missing references deeper in the tree will not be loaded.

## Limit, skip and paging
The bigger your database gets, the more important this will be.
<pre>
const books = await db.book.limit(3).skip(1).toArray();

const booksOnPage3 = await db.book.page(3).toArray(); // 0 = first page
const books51to100 = await db.book.page(1, 50).toArray();
</pre>

You can set the default page size by setting
<pre>
Query.defaultPageSize = 120;
</pre>