# Audit
vlquery supports native audit logging. 
To enable it, create an audit table in your database.
For this example, let's use a table named `audit`.

Expand your `vlconfig.json` by adding `audit` to `context`
```
{
	"context": {
		"audit": {
			"entity": "audit",
			"track": {
				"timestamp": "timestamp",
				"comment": "comment",
				"action": "action",
				"object": "object",
				"entity": "entity",
				"objectId": "id"
			},
			"commentRequired": true
		},
		...
	}
}
```

> Use camel-case instead of `_` for the tracked columns and the entity name

Every `create`, `update` or `delete` on any entity will automatically create an audit entry. 
The keys defined in `track` will be saved to the audit log.

To add a comment to the audit log, add a string in your database calls
Set `commentRequired` to true to make any calls without a comment throw an error!
<pre>
book.create(<b>"Created new book!"</b>);
book.update(<b>"Updated books info!"</b>);
book.delete(<b>"Removed book!</b>);
</pre>

These generated values can be tracked in the audit
Name | Value | Example
-------- | ------- | -------
comment | Comment passed as argument | `Updated Book`
timestamp | Current time stamp | `2020-10-19T06:45:44.173Z`
action | `add`, `update` or `delete` | `update`
object | Current Object | `{"id":"...","title":"My First Book"}`
entity | Entity, name in database | `book`
id | Id of the entity | `66eff73a-b03c-47c2-bb26-b3ef6eee7f84`

## Run Context
Just adding the standard values might not be enought.
Image you'd want to add the user that created the request to your server to the audit trail.
We need to get this user somehow, without the hassle of passing him to the database calls every time we wanna access his data.

Enable the `RunContext` by setting the `runContext` configuration in `vlconfig.json` to true
<pre>
{
    "context": {
		<b>"runContext": true</b>,
		...
	}
}
</pre>

This adds a `RunContext` parameter to the generated `DbContext`-class, which will be passed to the `DbSet`s
```
class RequestContext extends RunContext {
	currentUser: Person;
}

const context = new RequestContext();
const db = new DbContext(context, client);

await db.person.first("<uuid>");
```

Create a new `DbContext` for every request, so the audit always tracks the right user.
An entity is bound to the `DbContext` (client and run context) it has been loaded from or created in, see [Database context](database-context.md).

This will allow you to add custom properties to the tracked columns in the audit:
<pre>
{
	"context": {
		"runContext": true,
		"audit": {
			"entity": "audit",
			"track": {
				<b>"username": ["currentUser", "username"]</b>
				"timestamp": "timestamp",
				"comment": "comment",
				...
			},
</pre>

This will grab `runContext.currentUser.username` from the context when an audit should be created.

```
const book = await db.book.find("<uuid>");
book.update("Updated books information") // tracked with the run context of 'db', since the book has been loaded from it

const copy = new Book();
await db.book.create(copy, "Created book") // new entities have to be created through the set
```

The audit entry is written into the same database as the audited entity.

All values in the tracked property can be promises and will be resolved.
The audit-tracking will fail if any value in the projects path is null!