# Message Search API Guide

## Scope

This guide documents the full-text message search endpoints implemented in this repository.

Base path:

```text
/api/rooms
```

All endpoints require bearer authentication.

```http
Authorization: Bearer <token>
```

Useful backend references:

- `GET /docs`
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/message/controller/MessageController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/message/controller/MessageController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/message/service/MessageServiceImpl.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/message/service/MessageServiceImpl.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/message/repository/MessageRepository.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/message/repository/MessageRepository.java)

---

## How search works

Both endpoints use PostgreSQL full-text search (`tsvector` / `plainto_tsquery`). Results are ranked by relevance using `ts_rank` — more relevant matches appear first.

Key behaviors:
- **Stemming** — searching `"running"` will match messages containing `"run"`, `"runs"`, `"runner"`, etc.
- **Stop words** — common words like `"the"`, `"is"`, `"and"` are ignored.
- **Case insensitive** — `"Hello"` and `"hello"` return the same results.
- **Deleted messages** (`is_deleted = true`) are excluded from all results.
- Results are scoped to rooms the authenticated user is a member of.

---

## Message DTO

Both endpoints return a list of this shape:

```json
{
  "id": 12,
  "senderId": 3,
  "roomId": 7,
  "content": "hey are you joining the call?",
  "messageType": "TEXT",
  "mediaUrl": null,
  "mediaContentType": null,
  "mediaFileName": null,
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-03-30T14:22:10",
  "updatedAt": "2026-03-30T14:22:10"
}
```

`mediaUrl` is a pre-signed S3 URL and is only present when `messageType` is `IMAGE` or `VIDEO`.

---

## Endpoints

### Search messages in a room

Search within a single room. The authenticated user must be a member of the room.

```
GET /api/rooms/{roomId}/messages/search?text={query}
```

**Path parameters**

| Parameter | Type | Description          |
|-----------|------|----------------------|
| `roomId`  | Long | ID of the room to search in |

**Query parameters**

| Parameter | Type   | Required | Description    |
|-----------|--------|----------|----------------|
| `text`    | String | Yes      | Search query   |

**Example request**

```http
GET /api/rooms/7/messages/search?text=joining+the+call
Authorization: Bearer <token>
```

**Example response** `200 OK`

```json
[
  {
    "id": 12,
    "senderId": 3,
    "roomId": 7,
    "content": "hey are you joining the call?",
    "messageType": "TEXT",
    "mediaUrl": null,
    "mediaContentType": null,
    "mediaFileName": null,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-30T14:22:10",
    "updatedAt": "2026-03-30T14:22:10"
  }
]
```

**Error responses**

| Status | Reason                                      |
|--------|---------------------------------------------|
| `401`  | Missing or invalid bearer token             |
| `403`  | Authenticated user is not a member of the room |
| `404`  | Room not found                              |

---

### Search messages across all rooms

Search across every room the authenticated user belongs to. Rooms the user is not a member of are automatically excluded.

```
GET /api/rooms/messages/search?text={query}
```

**Query parameters**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| `text`    | String | Yes      | Search query |

**Example request**

```http
GET /api/rooms/messages/search?text=deployment
Authorization: Bearer <token>
```

**Example response** `200 OK`

```json
[
  {
    "id": 45,
    "senderId": 1,
    "roomId": 3,
    "content": "deployment is done, check the logs",
    "messageType": "TEXT",
    "mediaUrl": null,
    "mediaContentType": null,
    "mediaFileName": null,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-29T09:10:00",
    "updatedAt": "2026-03-29T09:10:00"
  },
  {
    "id": 38,
    "senderId": 2,
    "roomId": 5,
    "content": "who triggered the deployment?",
    "messageType": "TEXT",
    "mediaUrl": null,
    "mediaContentType": null,
    "mediaFileName": null,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-28T17:45:00",
    "updatedAt": "2026-03-28T17:45:00"
  }
]
```

**Error responses**

| Status | Reason                          |
|--------|---------------------------------|
| `401`  | Missing or invalid bearer token |

---

## Notes

- An empty array `[]` is returned when no messages match the query — not a `404`.
- Media messages (`IMAGE`, `VIDEO`) are searchable only if a text `content` was included when the message was sent.
- The `tsvector` column (`content_tsv`) is a generated column in PostgreSQL — it is kept in sync automatically and requires no application-level maintenance.