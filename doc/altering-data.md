# Updating data
vlquery can save your data too!

## Creating records
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

## Updating existing records
Whenever your data need some refreshing, do this:
<pre>
const book = await db.book.find("&lt;uuid&gt;");
book.title = "New Title";

await book.update();
</pre>

## Deleting a record
When your data is no longer required, it can be deleted with this code.
vlquery will check all references before you can delete the item!
<pre>
const book = await db.book.find("&lt;uuid&gt;");
await book.delete();
</pre>

If you are using an active column, this will only deactivate the row!