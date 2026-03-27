# Frontend API Integration Guide

## Scope

This guide reflects the current backend implementation in this repository.

The backend currently exposes:

- JWT-based REST authentication
- user profile endpoints
- room and room-membership endpoints
- STOMP over SockJS for live chat
- OpenAPI docs at `/docs`

Useful backend references:

- `GET /docs`
- `GET /v3/api-docs`
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java](src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java)

## Base URL

Local development:

```ts
export const API_BASE_URL = "http://localhost:8080";
```

## CORS

The backend currently allows frontend requests from:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://kurakaani.me`

## Authentication Model

Protected REST endpoints expect:

```http
Authorization: Bearer <token>
```

The login response shape is:

```json
{
  "token": "<jwt>",
  "username": "abhishek",
  "roles": ["ROLE_USER"]
}
```

Recommended frontend session storage:

```ts
type Session = {
  token: string;
  username: string;
  roles: string[];
};
```

## Recommended API Wrapper

```ts
const API_BASE_URL = "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const isFormData = init.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw error ?? new Error(`Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
```

## Auth Endpoints

### Register

`POST /api/auth/register`

Request body:

```json
{
  "username": "abhishek",
  "password": "secret123",
  "email": "abhishek@example.com"
}
```

Current response:

```http
200 OK
```

Note:
The controller signature returns `AuthResponse`, but the current implementation sends an empty body. The frontend should not expect a token from registration.

### Login

`POST /api/auth/login`

Request body:

```json
{
  "username": "abhishek",
  "password": "secret123"
}
```

Response body:

```json
{
  "token": "<jwt>",
  "username": "abhishek",
  "roles": ["ROLE_USER"]
}
```

Recommended frontend flow:

1. Call `/api/auth/login`.
2. Persist `token`, `username`, and `roles`.
3. Attach the token to future REST requests.
4. Use the same token for WebSocket STOMP connect headers.

### Password Reset

`POST /api/auth/password-reset`

Request body:

```json
{
  "email": "abhishek@example.com"
}
```

Response:

```http
200 OK
```

### Password Reset Confirm

`POST /api/auth/password-reset-confirm`

Request body:

```json
{
  "token": 123456,
  "password": "newSecret123"
}
```

Response:

```http
200 OK
```

## User Endpoints

### Get Current User

`GET /api/user/me`

Requires bearer token.

Example response:

```json
{
  "id": 1,
  "userName": "abhishek",
  "email": "abhishek@example.com",
  "profileImageUrl": "https://...",
  "enabled": true,
  "roles": ["ROLE_USER"],
  "createdAt": "2026-03-23T16:00:00",
  "updatedAt": "2026-03-23T16:00:00"
}
```

### Update Current User

`PATCH /api/user/me`

Requires bearer token.

Request body:

```json
{
  "userName": "abhishek-new",
  "email": "new@example.com"
}
```

### Upload Profile Picture

`POST /api/user/profilePic/upload`

Requires bearer token and `multipart/form-data`.

Form fields:

- `file`: required image file

Response:

```http
200 OK
```

Fetch `GET /api/user/me` after upload to get the latest presigned `profileImageUrl`.

### Admin User Endpoints

These endpoints are intended for admins:

- `GET /api/user`
- `GET /api/user/{userId}`
- `DELETE /api/user/{userId}`

## Room Endpoints

All room endpoints require bearer authentication.

### Get Rooms

`GET /api/rooms`

Returns all rooms the authenticated user is a member of, each with the most recent message.

Response shape:

```json
[
  {
    "id": 1,
    "name": "General",
    "description": "Main room",
    "type": "GROUP",
    "memberCount": 4,
    "recentMessage": {
      "id": 10,
      "roomId": 1,
      "content": "hey everyone",
      "messageType": "TEXT",
      "sentAt": "2026-03-24T10:30:00",
      "sender": {
        "id": 2,
        "username": "ram"
      }
    },
    "unreadCount": 0
  }
]
```

`recentMessage` is `null` for rooms that have no messages yet.

### Get Messages For Room

`GET /api/rooms/room/{roomId}/message`

Returns the full message history for a room.

Response shape:

```json
[
  {
    "id": 10,
    "roomId": 1,
    "content": "hey everyone",
    "messageType": "TEXT",
    "mediaUrl": null,
    "mediaContentType": null,
    "mediaFileName": null,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-24T10:30:00",
    "updatedAt": "2026-03-24T10:30:00",
    "userInfo": {
      "id": 2,
      "username": "ram",
      "profileImageUrl": "https://..."
    }
  }
]
```

Media messages use `messageType` values `IMAGE` or `VIDEO` and return a presigned `mediaUrl`.

Notes:

- `content` is optional for media messages and acts like a caption.
- `mediaUrl` is temporary because it is presigned, so the frontend should not cache it long-term.

### Upload Image Or Video To Room

`POST /api/rooms/room/{roomId}/message/media`

Send `multipart/form-data` with:

- `file`: required image or video file
- `content`: optional caption

Response shape:

```json
{
  "id": 11,
  "senderId": 2,
  "roomId": 1,
  "content": "weekend clip",
  "messageType": "VIDEO",
  "mediaUrl": "https://...",
  "mediaContentType": "video/mp4",
  "mediaFileName": "clip.mp4",
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-03-24T10:35:00",
  "updatedAt": "2026-03-24T10:35:00"
}
```

The backend also broadcasts the same payload to `/topic/rooms/{roomId}`.

### Get Room Members

`GET /api/rooms/room/{roomId}`

Response shape:

```json
[
  {
    "roomMemberId": 1,
    "roomId": 1,
    "userId": 1,
    "roomRole": "ADMIN",
    "joinedAt": "2026-03-23T16:00:00"
  }
]
```

### Create Room

`POST /api/rooms`

Request body:

```json
{
  "name": "General",
  "description": "Main room",
  "type": "GROUP"
}
```

Allowed `type` values:

- `DM`
- `GROUP`

Response (`201 Created`):

```json
{
  "id": 1,
  "name": "General",
  "description": "Main room",
  "members": [
    {
      "roomMemberId": 1,
      "roomId": 1,
      "userId": 1,
      "roomRole": "ADMIN",
      "joinedAt": "2026-03-23T16:00:00"
    }
  ],
  "messages": [],
  "type": "GROUP",
  "createdById": 1,
  "createdAt": "2026-03-23T16:00:00",
  "updatedAt": "2026-03-23T16:00:00"
}
```

### Add Users To Room

`POST /api/rooms/room/{room_id}/add`

Request body:

```json
{
  "userIds": [2, 3]
}
```

Response:

```http
200 OK
```

### Remove Users From Room

`POST /api/rooms/room/{room_id}/remove`

Request body:

```json
{
  "membersId": [2, 3]
}
```

Response:

```http
204 No Content
```

Important:
The current backend implementation for removal does not behave like a proper room-membership unlink. Frontend code should treat this endpoint as unsafe until the backend logic is corrected.

## WebSocket Chat

The backend exposes:

- handshake endpoint: `/ws`
- app destination prefix: `/app`
- broker topic prefix: `/topic`

Current chat flow:

- connect to `/ws`
- send `Authorization: Bearer <jwt>` in STOMP `CONNECT` headers
- subscribe to `/topic/rooms/{roomId}`
- publish text messages to `/app/chat.send/{roomId}`
- upload image/video messages with `POST /api/rooms/room/{roomId}/message/media`

Minimal frontend example:

```ts
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const client = new Client({
  webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
  connectHeaders: {
    Authorization: `Bearer ${token}`
  },
  reconnectDelay: 5000
});

client.onConnect = () => {
  client.subscribe(`/topic/rooms/${roomId}`, (frame) => {
    const message = JSON.parse(frame.body);
    console.log("received", message);
  });
};

client.activate();
```

Send message:

```ts
client.publish({
  destination: `/app/chat.send/${roomId}`,
  body: JSON.stringify({ content: "hello" })
});
```

Expected message payload:

```json
{
  "id": 10,
  "senderId": 2,
  "roomId": 1,
  "content": "hello",
  "messageType": "TEXT",
  "mediaUrl": null,
  "mediaContentType": null,
  "mediaFileName": null,
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-03-23T16:00:00",
  "updatedAt": "2026-03-23T16:00:00"
}
```

Expected media message payload on the same subscription:

```json
{
  "id": 11,
  "senderId": 2,
  "roomId": 1,
  "content": "weekend clip",
  "messageType": "VIDEO",
  "mediaUrl": "https://...",
  "mediaContentType": "video/mp4",
  "mediaFileName": "clip.mp4",
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-03-23T16:05:00",
  "updatedAt": "2026-03-23T16:05:00"
}
```

## Known Backend Caveats

- Room member removal (`POST /api/rooms/room/{room_id}/remove`) currently deletes the users from the users table rather than unlinking them from the room. Do not use this in production until the backend logic is corrected.
- Registration currently returns no auth payload.
- WebSocket message send still depends on STOMP session authentication being attached correctly.
