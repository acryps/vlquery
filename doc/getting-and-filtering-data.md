# Getting and filtering data
You can get data from the database using the `db` variable

<pre>
const book = await db.book.find("&lt;uuid&gt;");
const books = await db.book.toArray();
const authorCount = await db.authr.count();
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

## Putting everyting into order
postgres can be very funny when it comes to the order of records in a table, so to make sure everyting is ordered properly, use the order by methods.
<pre>
const books = await db.book
	.orderByAscending(book => book.author.lastname)
	.orderByAscending(book => book.title)
	.toArray();
</pre>

## Resolving references
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

## Limit, skip and paging
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