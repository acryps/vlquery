# Database context
vlquery has no global connection. Every query and every change runs in a database context, a `DbContext` created with a `DbClient` (and a `RunContext`, if enabled).
vlquery never guesses a context. If an operation has none, it throws a `DatabaseContextError`.

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

## Multiple databases
All databases sharing the same structure can use the same generated context. Create a `DbContext` for each one
<pre>
const europe = new DbContext(new DbClient({ host: "eu.db.example.com", database: "shop" }));
const america = new DbContext(new DbClient({ host: "us.db.example.com", database: "shop" }));

await Promise.all([europe.client.connect(), america.client.connect()]);

const order = await europe.order.find("&lt;uuid&gt;");
</pre>

## Entities are bound to their context
An entity remembers the context it has been loaded from or created in.
`.update()`, `.delete()`, `.createDuplicate()` and its references (`order.items`, `order.customer.fetch()`) all use this context
<pre>
const order = await america.order.find("&lt;uuid&gt;");
order.status = "shipped";

await order.update(); // writes to america
const items = await order.items.toArray(); // reads from america
</pre>

Audit entries are written into the database of the audited entity.

## Creating new entities
A new entity has no context. Create it through a set, or attach it to a set first
<pre>
const order = new Order();
await europe.order.create(order);

// or
const order = europe.order.attach(new Order());
await order.create();
</pre>

After either call, `order` is bound to `europe`.

Calling `.create()`, `.update()` or `.delete()` on an entity without a context, or using its references, throws a `DatabaseContextError`
<pre>
const order = new Order();
await order.create(); // DatabaseContextError: No database context set for this 'order'
</pre>

## Moving entities between contexts
An entity can only be bound to one context.
Attaching it to another context, or passing it to `create`, `update` or `delete` of another context's set throws a `DatabaseContextError`.
Two `DbContext`s are only the same context if they use the same `DbClient` and the same `RunContext`.
<pre>
const order = await europe.order.find("&lt;uuid&gt;");

await america.order.create(order); // DatabaseContextError: This 'order' is already attached to another database context
</pre>

Use `.detach()` to release an entity from its context before using it in another one.
To copy a record into another database, detach a duplicate (which has no id yet)
<pre>
const order = await europe.order.find("&lt;uuid&gt;");

const copy = order.createDuplicate().detach();
await america.order.create(copy); // inserted into america with a new id, order stays bound to europe
</pre>

Assigning a reference (`order.customer = customer`) only copies the id, it does not check the context of `customer`.
