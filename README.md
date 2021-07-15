[![npm version](http://badge.acryps.com/npm/vlquery)](http://badge.acryps.com/go/npm/vlquery)

<img src="doc/assets/logo.svg" height="50">

# vlquery TypeScript ORM
Simple to use TypeScript based database first ORM for postgres.

Example usage:
<pre>
const books = await db.book
	.where(book => book.author.firstname == "Jan")
	.orderByAscending(book => book.title.lowercase())
	.toArray();

const author = await db.person.find("&lt;a very long uuid&gt;");
const authorsFirstBookFrom2001 = await author.books
	.first(book => book.publishedAt.year == 2001);

authorsFirstBookFrom2001.title = "A new title";
await authorsFirstBookFrom2001.update();
</pre>

## Examples
[Simple Example Project](https://github.com/levvij/vlquery-example)<br>
[Using audits with an express server](https://github.com/levvij/vlquery-audit-example)

## Documentation
[Getting started](doc/getting-started.md)<br>
[Database structure](doc/database-structure.md)<br>
[Reading, filtering and ordering data](doc/read-filter-order.md)<br>
[Altering data](doc/altering-data.md)<br>
[Adding audits](doc/audit.md)<br>
[Performance and include](doc/performance-and-include.md)

## Sponsoring and support
This project is sponsored and supported by [inter allied crypsis / ACRYPS](https://acryps.com) and [VLVT.IN GmbH](https://vlvt.in).