# Query Functions
Query functions can be used in `where`, `first`, `orderByAscending`, `orderByDescending`.
[How to read, filter and order data](read-filter-order.md)

If you are missing a function, please open an issue!

## Date Functions
```
column.isAfter(date) // checks if the column is after the date parameter
column.isBefore(date) // checks if the column is before the date parameter
column.toISODate(): QueryString // converts to an iso string

column.isToday() // checks if the column is today (current date). this uses the postgres servers time (might diverge form your node processes time/timezone)

column.toDate() // only TIMESTAMP: converts to date (sets time to 00:00:00)
```

## String Operators
```
column.startsWith(string) // checks if the column starts with the string parameter
column.startOf(string) // checks if the string parameters starts with the columns value

column.endsWith(string) // checks if the column ends with the string parameter
column.endOf(string) // checks if the string parameters ends with the columns value

column.includes(string) // checks if the column includes the string parameter
column.substringOf(string) // checks if the string parameter includes the columns value

column.uppercase(): QueryString // converts the string to upper case (ABC)
column.lowercase(): QueryString // converts the string to lower case (abc)

column.length(): QueryNumber // get the strings length (ABC = 3)

column.hash(algo): QueryString // hashes the string (requires pgcrypto, algo can be md5, sha1, sha224, sha256, sha384 or sha512 by default)
```

## ByteArray / Buffer / Blob Operators
```
column.byteLength(): QueryNumber // gets the byte length of the data
```

## Chaining
Functions with a query type return value (eg. `QueryString`, ...) can be chained
```
await this.books
    .where(book => book.title.lowercase().includes("test"))
    .orderByAscending(book => book.author.firstname.lowercase())
    .toArray()
```
