# Frontend API Integration Guide

## Overview

This backend exposes:

- REST APIs secured with JWT bearer tokens
- Google OAuth2 login that returns a JWT payload
- STOMP over SockJS for live chat
- OpenAPI docs at `/docs`

Useful references in the backend:

- `GET /docs`
- `GET /v3/api-docs`
- [src/main/java/com/abhishekojha/kurakanimonolith/common/SecurityConfig.java](src/main/java/com/abhishekojha/kurakanimonolith/common/SecurityConfig.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/OAuth2AuthenticationSuccessHandler.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/OAuth2AuthenticationSuccessHandler.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/common/security/WebSocketConfig.java](src/main/java/com/abhishekojha/kurakanimonolith/common/security/WebSocketConfig.java)

## Base URL

For local development:

```ts
export const API_BASE_URL = "http://localhost:8080";
```

## Authentication Flow

### Login Entry Point

Start login by navigating the browser to:

```http
GET /oauth2/authorization/google
```

There is also a public helper endpoint:

```http
GET /api/auth/public
```

Example response:

```json
{
  "message": "Public auth endpoint",
  "loginUrl": "/oauth2/authorization/google"
}
```

### OAuth2 Success Response

After Google login succeeds, the backend returns JSON directly from the OAuth2 callback handler.

Example payload:

```json
{
  "tokenType": "Bearer",
  "accessToken": "jwt-token",
  "expiresAt": "2026-03-22T10:00:00Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User",
    "roles": ["ROLE_USER"]
  }
}
```

### Token Usage

Send the token on every protected REST request:

```http
Authorization: Bearer <accessToken>
```

## Recommended Frontend API Wrapper

```ts
const API_BASE_URL = "http://localhost:8080";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw error ?? new Error(`Request failed with ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}
```

## REST API Endpoints

### Public

#### `GET /api/auth/public`

Returns a public payload with the login URL.

### User

#### `GET /api/user/profile`

Requires `Authorization: Bearer <token>`.

Example response:

```json
{
  "message": "User content",
  "principal": "user@example.com",
  "authorities": [
    {
      "authority": "ROLE_USER"
    }
  ]
}
```

### Admin

#### `GET /api/admin/dashboard`

Requires a token with `ROLE_ADMIN`.

### Rooms

#### `POST /api/rooms`

Creates a room.

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

Example response shape:

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
      "joinedAt": "2026-03-22T15:00:00"
    }
  ],
  "messages": [],
  "type": "GROUP",
  "createdById": 1,
  "createdAt": "2026-03-22T15:00:00",
  "updatedAt": "2026-03-22T15:00:00"
}
```

#### `GET /api/rooms/room/{roomId}`

Returns room members for the given room.

Example response:

```json
[
  {
    "roomMemberId": 1,
    "roomId": 1,
    "userId": 1,
    "roomRole": "ADMIN",
    "joinedAt": "2026-03-22T15:00:00"
  }
]
```

#### `POST /api/rooms/room/{room_id}/add`

Adds users to a room.

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

#### `POST /api/rooms/room/{room_id}/remove`

Current request body:

```json
{
  "membersId": [2, 3]
}
```

Response:

```http
204 No Content
```

## WebSocket Chat Integration

This project uses SockJS with STOMP.

### Endpoints

- WebSocket handshake: `/chat`
- Publish destination: `/app/sendMessage/{roomId}`
- Subscribe destination: `/topic/room/{roomId}`

### Message Request Body

```json
{
  "roomId": 1,
  "content": "hello"
}
```

### Frontend Example

```ts
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = "http://localhost:8080";

const client = new Client({
  webSocketFactory: () => new SockJS(`${API_BASE_URL}/chat`)
});

client.onConnect = () => {
  client.subscribe("/topic/room/1", (frame) => {
    const message = JSON.parse(frame.body);
    console.log("received", message);
  });

  client.publish({
    destination: "/app/sendMessage/1",
    body: JSON.stringify({
      roomId: 1,
      content: "hello"
    })
  });
};

client.activate();
```

### Returned Message Shape

The WebSocket controller currently returns the persisted `Message` entity. The frontend should expect a payload shaped roughly like:

```json
{
  "id": 10,
  "content": "hello",
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-03-22T15:00:00",
  "updatedAt": "2026-03-22T15:00:00"
}
```

Treat this shape carefully because the response comes from the entity, not a dedicated API DTO.

## Error Response Shape

The backend returns structured JSON errors.

Example:

```json
{
  "status": 404,
  "error": "NOT_FOUND",
  "message": "Room not found",
  "path": "/api/rooms/room/99",
  "timestamp": "2026-03-22T15:00:00",
  "fieldErrors": null
}
```

Recommended frontend error handler:

```ts
type ApiError = {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  fieldErrors?: { field: string; message: string }[] | null;
};
```

## Frontend State To Store

After login, store:

- `accessToken`
- `expiresAt`
- `user.id`
- `user.email`
- `user.name`
- `user.roles`

Example:

```ts
type SessionUser = {
  id: number;
  email: string;
  name: string;
  roles: string[];
};

type SessionState = {
  accessToken: string;
  expiresAt: string;
  user: SessionUser;
};
```

## Known Integration Caveats

### 1. OAuth callback returns JSON directly

The current login success flow returns JSON from the backend callback rather than redirecting back to the frontend with a token. That means a normal SPA popup/redirect flow may need backend adjustment if you want a smoother login experience.

### 2. CORS is incomplete

Only some endpoints explicitly allow `http://localhost:5173`:

- room controller
- message controller
- websocket handshake

Auth, user, and admin routes do not currently have matching explicit CORS configuration. Browser calls from a separate frontend origin may fail until global CORS is added.

### 3. No REST endpoint for message history

Messages are currently sent over WebSocket. There is no REST endpoint yet for fetching room message history.

### 4. Remove-members endpoint should not be wired yet

The current remove-members service implementation appears to delete users by ID rather than remove room membership links. Do not expose that action in the frontend until the backend implementation is fixed.

## Suggested Frontend Integration Order

1. Build a shared `apiFetch` wrapper with bearer token support.
2. Implement login entry using `/api/auth/public` or `/oauth2/authorization/google`.
3. Persist the returned JWT session payload.
4. Build protected user-profile loading with `/api/user/profile`.
5. Add room creation and room-members views.
6. Add STOMP chat subscribe/send flow.
7. Add token expiration handling and logout cleanup.

