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

## Examples
[Simple Example Project](https://github.com/levvij/vlquery-example)
[Using audits with an express server](https://github.com/levvij/vlquery-audit-example)

## Documentation
[Getting started](doc/getting-started.md)<br>
[Database structure](doc/database-structure.md)<br>
[Getting and filtering data](doc/getting-and-filtering-data.md)<br>
[Altering data](doc/altering-data.md)<br>
[Adding audits](doc/audit.md)<br>
[Performance and include](doc/performance-and-include.md)