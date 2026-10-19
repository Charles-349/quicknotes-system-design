# QuickNotes API Design

This document describes the production QuickNotes API, not the JSONPlaceholder
practice service used by the browser client. The API is JSON over HTTPS and is
versioned under `/api/v1`. Unless an endpoint is explicitly public, requests
must include an `Authorization` header containing the issued bearer access
token. Notes and tags are scoped to the authenticated user.

## Endpoints

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/tokens` | Authenticate with email and password and issue an access token. | `200 OK` |
| `GET` | `/api/v1/notes` | List the authenticated user's notes, newest first; supports `limit` and `cursor` query parameters. | `200 OK` |
| `POST` | `/api/v1/notes` | Create a note for the authenticated user. | `201 Created` |
| `GET` | `/api/v1/notes/{noteId}` | Retrieve one of the authenticated user's notes. | `200 OK` |
| `PATCH` | `/api/v1/notes/{noteId}` | Update a note's title, body, or tags. | `200 OK` |
| `DELETE` | `/api/v1/notes/{noteId}` | Delete a note owned by the authenticated user. | `204 No Content` |
| `GET` | `/api/v1/tags` | List the authenticated user's tags. | `200 OK` |
| `PUT` | `/api/v1/notes/{noteId}/tags/{tagId}` | Add an existing tag to a note; the association is idempotent. | `204 No Content` |
| `DELETE` | `/api/v1/notes/{noteId}/tags/{tagId}` | Remove a tag association from a note. | `204 No Content` |

### Authentication

`POST /api/v1/auth/tokens` accepts credentials:

```json
{
  "email": "alex@example.com",
  "password": "<user-password>"
}
```

On success, the response includes a short-lived access token:

```json
{
  "accessToken": "<issued-access-token>",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### List notes

`GET /api/v1/notes?limit=20&cursor=eyJpZCI6...` returns a page. `limit` is
optional, defaults to 20, and is capped at 100. Omit `cursor` for the first
page. `nextCursor` is `null` when there are no more results.

```json
{
  "data": [
    {
      "id": "note_01J8Z4R7M2",
      "title": "Planning",
      "body": "Prepare the weekly agenda.",
      "tags": [
        {
          "id": "tag_01J8Z4S1N3",
          "name": "work"
        }
      ],
      "createdAt": "2026-10-19T09:00:00Z",
      "updatedAt": "2026-10-19T09:00:00Z"
    }
  ],
  "nextCursor": "eyJpZCI6Im5vdGVfMDEuLi4ifQ"
}
```

### Create a note

`POST /api/v1/notes` requires a non-empty `title` of at most 100 characters.
`body` is optional and defaults to an empty string. `tagIds` is optional and
must contain tags owned by the authenticated user.

Request:

```json
{
  "title": "Meeting notes",
  "body": "Discuss launch timeline.",
  "tagIds": ["tag_01J8Z4S1N3"]
}
```

Response (`201 Created`), with a `Location: /api/v1/notes/note_01J8Z4R7M2`
header:

```json
{
  "id": "note_01J8Z4R7M2",
  "title": "Meeting notes",
  "body": "Discuss launch timeline.",
  "tags": [
    {
      "id": "tag_01J8Z4S1N3",
      "name": "work"
    }
  ],
  "createdAt": "2026-10-19T09:15:00Z",
  "updatedAt": "2026-10-19T09:15:00Z"
}
```

### Update and delete notes

`PATCH /api/v1/notes/{noteId}` accepts any subset of `title`, `body`, and
`tagIds` and returns the updated note using the same shape as the create
response. A supplied title follows the same validation as note creation.
`DELETE /api/v1/notes/{noteId}` returns `204 No Content` with an empty body.

## Errors

Errors use a consistent JSON object with a stable machine-readable `code`, a
human-readable `message`, and optional field-level `details`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "issue": "Title is required and must be at most 100 characters."
      }
    ],
    "requestId": "req_01J8Z5A6B7"
  }
}
```

| Status | Meaning | Typical use |
| --- | --- | --- |
| `400 Bad Request` | Request is malformed or fails validation. | Invalid JSON, missing title, title over 100 characters, or an invalid pagination parameter. |
| `401 Unauthorized` | Authentication is missing or invalid. | Missing, expired, or invalid bearer token; invalid login credentials. |
| `403 Forbidden` | The authenticated user is not permitted to perform the action. | Attempt to use a tag that belongs to another user. |
| `404 Not Found` | The requested resource does not exist or is not available to the user. | Unknown note or tag ID; private notes owned by another user are treated as not found to avoid disclosing their existence. |
| `500 Internal Server Error` | An unexpected server-side failure occurred. | Unhandled application or infrastructure error. The response must not expose stack traces or internal details. |

All error responses use the JSON error shape above. The API should also return
the appropriate HTTP status and a request ID to support diagnosis without
exposing sensitive data.
