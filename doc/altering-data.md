# Updating data
vlquery can save your data too!

## Creating records
Let's create a simple book with a refrence to its author
<pre>
const author = await db.author.find("&lt;uuid&gt;");

const book = new Book();
book.title = "My First Book!";
book.author = author;

await db.create(book);
</pre>

Alternatively to using `.author` you could do this:

<pre>
book.authorId = "&lt;uuid&gt;";
</pre>

Assigning a reference only copies the id of the referenced entity, the referenced entity must have been saved before.

vlquery will add the new id of your record to it, so after calling create, you'll be able to use the new id!

Entities are plain data, all changes go through the database context `db`. 
The context decides which database is changed, the entity itself does not know where it has been loaded from.
Read more in [Database context](database-context.md).

## Updating existing records
Whenever your data need some refreshing, do this:
<pre>
const book = await db.book.find("&lt;uuid&gt;");
book.title = "New Title";

await db.update(book);
</pre>

## Deleting a record
When your data is no longer required, it can be deleted with this code.
Records which are still referenced by other records can not be deleted, the foreign key constraints of your database will reject it.
<pre>
const book = await db.book.find("&lt;uuid&gt;");
await db.delete(book);
</pre>

If you are using an active column, this will only deactivate the row!

`update` and `delete` throw a `DatabaseContextError` if the record does not exist in the database of `db`.
<pre>
const book = await america.book.find("&lt;uuid&gt;");

await europe.update(book); // DatabaseContextError, the book does not exist in europe
</pre>

## Duplicating a record
Records can be duplicated by using the `createDuplicate` method of the database context. The copy has no id and is not saved yet
<pre>
const book = await db.book.find("&lt;uuid&gt;");

const copy = db.createDuplicate(book);
copy.title += " (Copy)";
await db.create(copy);

console.log(book.title); // "My first book"
console.log(copy.title) // "My first book (Copy)"
</pre>

The duplicate can be created in another database, see [Copying data between databases](database-context.md#copying-data-between-databases).

## Summary
Action | Call
-------- | -------
Create | `await db.create(entity, comment?)`
Update | `await db.update(entity, comment?)`
Delete | `await db.delete(entity, comment?)`
Duplicate | `db.createDuplicate(entity)`

The comments are used for [audits](audit.md).