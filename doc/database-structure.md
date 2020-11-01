# Database Structure

Every entity requires an `id` column of type `uuid`. You can use an integer, but it will be treated as a string.

## Naming
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

## References
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

## Deactivate instead of delete
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