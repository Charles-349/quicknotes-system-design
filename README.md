# QuickNotes System Design

QuickNotes is a browser-based notes client and a set of backend design
documents for a service planned to support one million users. The client
demonstrates loading notes with GET, creating notes with POST, and removing
notes with DELETE through the JSONPlaceholder practice API. The design
documents describe the real QuickNotes API and its proposed data model and
production architecture.

## Run the API client

The client is static HTML, CSS, and JavaScript; it has no build step or
additional dependencies. From the project directory, start a local web server:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000> in a browser and select **Load notes** or submit
the form to create a note. The client requires an internet connection to reach
JSONPlaceholder. Its POST and DELETE endpoints simulate writes rather than
persisting changes, so newly created notes will not survive a page reload and
a later GET may return sample notes that were previously deleted from the
client's displayed list.

## Design documents

- [API design](docs/api-design.md) — production REST endpoints, payload
  examples, and error responses.
- [Data model](docs/data-model.md) — PostgreSQL entities, relationships,
  constraints, indexes, and example queries.
- [Architecture](docs/architecture.md) — requirements, load estimates,
  architecture diagram, request flows, and trade-offs.

## What I learned

- A reusable fetch helper can centralize HTTP error checking while separate
  request handlers manage loading, success, and error states.
- User-provided text should be rendered with `textContent`, and form input
  should be validated before it is sent to an API.
- Practice APIs can simulate successful writes without persistence, so a
  client must distinguish its local display from durable server state.
- Relational constraints and indexes support ownership, many-to-many
  relationships, and efficient user-scoped pagination.
