# QuickNotes Data Model

QuickNotes stores users, their notes, reusable tags, and the associations
between notes and tags in PostgreSQL. All identifiers are UUIDs. Timestamps
are stored in UTC using `TIMESTAMPTZ`.

## Entities and relationships

- **users**: an account that owns notes and tags. `id` is the primary key;
  `email` is unique, and `password_hash` stores only a securely hashed
  password.
- **notes**: a user's note with a required title (up to 100 characters), an
  optional body, and creation/update timestamps. Each note belongs to exactly
  one user, so users to notes is a one-to-many relationship.
- **tags**: a reusable label owned by one user. A user can have many tags, and
  tag names are unique within that user's account.
- **note_tags**: a join table linking notes and tags. A note can have many
  tags, and a tag can be applied to many notes, so notes to tags is
  many-to-many. The composite primary key prevents duplicate associations.

The API must verify that a note and tag belong to the authenticated user
before creating an association; the foreign keys ensure both referenced rows
exist. Deleting a user cascades to their notes and tags, and deleting a note
or tag removes its associations.

## PostgreSQL schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);
```

`gen_random_uuid()` is available in modern PostgreSQL releases. The service
must update `notes.updated_at` whenever it modifies a note.

## Indexes

```sql
CREATE INDEX notes_user_updated_idx
    ON notes (user_id, updated_at DESC, id DESC);

CREATE INDEX note_tags_tag_id_idx
    ON note_tags (tag_id);
```

`notes_user_updated_idx` supports the authenticated user's newest-first notes
list and cursor pagination without scanning other users' notes. The composite
primary key on `note_tags` already indexes lookups by `note_id`; the
additional `tag_id` index supports finding notes for a tag and efficient
cascading deletes from tags. The unique constraint on `(user_id, name)` also
creates an index for a user's tag lookup.

## Example queries

List a user's notes newest first, using the last row's timestamp and ID as the
cursor for the next page:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
  AND (updated_at, id) < ($2, $3)
ORDER BY updated_at DESC, id DESC
LIMIT $4;
```

For the first page, omit the cursor predicate and use the same ordering and
limit. The application supplies the authenticated user's ID as `$1`; it must
not trust a user ID supplied by the client.

Fetch a note and its tags for an owner, using a `LEFT JOIN` so notes without
tags are included:

```sql
SELECT n.id, n.title, n.body, t.id AS tag_id, t.name AS tag_name
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id
LEFT JOIN tags AS t ON t.id = nt.tag_id
WHERE n.id = $1
  AND n.user_id = $2;
```

Create an association only when the note and tag both belong to the user.
The API performs the same ownership check; this statement ensures it in the
database operation as well:

```sql
INSERT INTO note_tags (note_id, tag_id)
SELECT n.id, t.id
FROM notes AS n
JOIN tags AS t ON t.user_id = n.user_id
WHERE n.id = $1
  AND n.user_id = $2
  AND t.id = $3
ON CONFLICT (note_id, tag_id) DO NOTHING;
```

Count notes per user, including users with no notes:

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

## SQL vs. NoSQL

QuickNotes should use a relational SQL database, PostgreSQL. Users own notes
and tags, while notes and tags have a many-to-many relationship; foreign keys,
unique constraints, and transactions keep these relationships consistent.
The service also needs efficient filtering, joins, and ordered pagination.
Although a document database could store each note with embedded tags, tags
are reusable entities and updates could otherwise duplicate or desynchronize
tag data across documents. PostgreSQL provides the required relational
integrity and flexible querying while still supporting JSON where useful at
the API boundary.
