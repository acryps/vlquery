# Database context
A `DbContext` is a connection to one database, created with a `DbClient` (and a `RunContext`, if enabled).
Every read and every write goes through a context. Entities are plain data, they never remember which database they have been loaded from.

<pre>
import { DbContext } from "./context";
import { DbClient } from "vlquery";

const client = new DbClient({
	host: "localhost",
	user: "postgres",
	password: ...,
	database: "my_project"
});

await client.connect();

const db = new DbContext(client);
</pre>

The connection options are passed to the postgres pool. Missing options fall back to the `PG*` environment variables.

Option | Default | Description
-------- | ------- | -------
`host`, `port`, `user`, `password`, `database` | `PG*` environment variables | Connection
`min` | `1` | Minimum open connections in the pool
`max` | `8` | Maximum open connections in the pool

If the connection is lost, the client reconnects and runs the queries which have been sent in the meantime. Every client reconnects independently.

If `runContext` is enabled in `vlconfig.json`, the run context is the second parameter: `new DbContext(client, runContext)`.

## Multiple databases
All databases sharing the same structure can use the same generated context. Create a `DbContext` for each one
<pre>
const europeClient = new DbClient({ host: "eu.db.example.com", database: "shop" });
const americaClient = new DbClient({ host: "us.db.example.com", database: "shop" });

await Promise.all([europeClient.connect(), americaClient.connect()]);

const europe = new DbContext(europeClient);
const america = new DbContext(americaClient);

const order = await europe.order.find("&lt;uuid&gt;");
</pre>

## Writing data
The context creates, updates and deletes entities
<pre>
const order = new Order();
order.status = "open";

await america.create(order); // sets order.id

order.status = "shipped";
await america.update(order);

await america.delete(order);
</pre>

`update` and `delete` require the row to exist in the context's database.
Updating or deleting an entity that only exists in another database (or that has already been deleted) throws a `DatabaseContextError`
<pre>
const order = await america.order.find("&lt;uuid&gt;");

await europe.update(order); // DatabaseContextError: 'order' with id '...' does not exist in this database
</pre>

> The check is done by id. If two databases contain a row with the same id (for example with `serial` ids), the row with this id will be updated. Use `uuid` ids for databases sharing data

## Copying data between databases
`createDuplicate` returns an unsaved copy without id, which can be created in any database
<pre>
const order = await europe.order.find("&lt;uuid&gt;");

const copy = europe.createDuplicate(order);
await america.create(copy); // new id in america
</pre>

## References
References only contain the data which has been included in the query
<pre>
const books = await db.book.include(book => book.author).toArray();

const author = await books[0].author.fetch(); // included
</pre>

Load references which have not been included through the context
<pre>
const book = await db.book.find("&lt;uuid&gt;");

const author = await db.fetch(book.author);
const books = await db.related(author.books)
	.where(book => book.publishedAt.year == 2001)
	.toArray();
</pre>

Calling `book.author.fetch()` or `author.books.toArray()` on a reference which has not been included throws a `DatabaseContextError`.

Use `backload` to load missing references of an entity
<pre>
await db.backload(book, { author: { firstname: true } });
</pre>

## Errors
All context related errors are `DatabaseContextError`s
<pre>
import { DatabaseContextError } from "vlquery";

try {
	await europe.update(order);
} catch (error) {
	if (error instanceof DatabaseContextError) {
		...
	}
}
</pre>

Cause | Message
-------- | -------
`update` or `delete` of a row which does not exist in this database | `'order' with id '...' does not exist in this database`
Reading a reference which has not been included | `Reference to 'customer' has not been included...`
Creating a `DbContext` without a `DbClient` | `A database context requires a DbClient`
Writing with a context without run context, if the audit requires one | `Update called on a database context without a run context!`
Querying a set which does not belong to a context, like `order.$$meta.set` | `No database context set for 'order'...`

## Reference
Method | Returns | Description
-------- | ------- | -------
`db.<table>` | `DbSet` | Set to query the table, see [Reading, filtering and ordering data](read-filter-order.md)
`db.views.<view>` | `ViewSet` | Set to query the view
`db.create(entity, comment?)` | `Promise<entity>` | Inserts the entity and sets its id
`db.update(entity, comment?)` | `Promise<entity>` | Updates the row with the entities id
`db.delete(entity, comment?)` | `Promise<void>` | Deletes (or deactivates) the row with the entities id
`db.createDuplicate(entity)` | `entity` | Unsaved copy of the entity without id
`db.fetch(entity.reference)` | `Promise<entity>` | Referenced entity, `null` for empty references
`db.related(entity.references)` | `Queryable` | Query of all entities referencing the entity
`db.backload(entity, tree)` | `Promise<void>` | Loads the references in the tree which have not been included
`db.findSet(Model)` | `DbSet` | Set of the model

The comments are used for [audits](audit.md).

## Naming
The sets of a `DbContext` are named after the tables. A table or view can not be named like a method of the context (`create`, `update`, `delete`, `createDuplicate`, `fetch`, `related`, `backload`, `findSet`) or `views`, `npx vlquery create-context` will fail.
