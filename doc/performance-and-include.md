# Performance and Include
A common problem with ORMs is the performance. 
We try to improve every aspect of the query fetching focusing on reducing data consumption and speed.

Tests showed us that
```
SELECT book.title, person.firstname, person.lastname
FROM book 
INNER JOIN person ON person.id = book.author_id
```

is around 6% slower compared to

```
SELECT json_build_object(
	'title', book.title,
	'firstname', person.firstname,
	'lastname', person.lastname	
)
FROM book
INNER JOIN person ON person.id = book.author_id
```

We can get another 3% faster (local db, even bigger improvements for remote databases) by compressing the names.

```
SELECT json_build_object(
	'a', a.title,
	'b', b.firstname,
	'c', b.lastname	
) AS a
FROM book AS a
INNER JOIN person AS b ON b.id = a.author_id
```

`includeTree` calls are required to improve the performance.
Let's demonstrate the power of includes (using a include tree in this example):

```
await db.book.includeTree({
	"title": 1,
	"author": {
		"firstname": 1,
		"lastname": 1
	},
	"reviews": {
		"title": 1,
		"reviewer": {
			"firstname": 1,
			"lastname": 1,
			"books": {
				"title": 1
			}
		}
	}
}).toArray();
```

This will create the following SQL-Query (expanded for readability)
```
SELECT json_build_object(
	'0', ext1.firstname, 
	'1', ext1.lastname, 
	'2', ext1.id, 
	'9', ext0.title, 
	'a', ext0.published_at, 
	'b', ext0.id, 
	'reviews', ext2._
) AS _ 
FROM book AS ext0 
	INNER JOIN person AS ext1 ON ext0.author_id = ext1.id 
	LEFT JOIN ( 
		SELECT ext3.book_id, json_agg(json_build_object(
			'5', ext4.firstname, 
			'6', ext4.lastname, 
			'7', ext3.title, 
			'8', ext3.id, 
			'books', ext5._
		)) AS _ 
		FROM review AS ext3 
			INNER JOIN person AS ext4 ON ext3.reviewer_id = ext4.id 
			LEFT JOIN ( 
				SELECT ext6.author_id, json_agg(json_build_object(
					'3', ext6.title, 
					'4', ext6.id
				)) AS _ FROM book AS ext6 
			GROUP BY ext6.author_id 
		) AS ext5 ON ext4.id = ext5.author_id 
		GROUP BY ext3.book_id 
	) AS ext2 ON ext0.id = ext2.book_id
```