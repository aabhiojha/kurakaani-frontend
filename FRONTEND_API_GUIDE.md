# Frontend API Integration Guide v2

## Scope

This guide reflects the current backend implementation in this repository:

- JWT-based REST authentication
- User profile endpoints
- Room management endpoints
- STOMP over SockJS chat transport
- OpenAPI docs exposed by Springdoc

Useful backend references:

- `GET /docs`
- `GET /v3/api-docs`
- [src/main/java/com/abhishekojha/kurakanimonolith/common/config/SecurityConfig.java](src/main/java/com/abhishekojha/kurakanimonolith/common/config/SecurityConfig.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java](src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java)

## Base URL

Local development base URL:

```ts
export const API_BASE_URL = "http://localhost:8080";
```

## Authentication Model

The backend expects JWT bearer authentication for protected REST routes.

Send this header on authenticated requests:

```http
Authorization: Bearer <token>
```

Current public auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset`
- `POST /api/auth/password-reset-confirm`

Protected endpoints include:

- `/api/user/**`
- `/api/rooms/**`

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

Current controller returns:

```http
200 OK
```

Note:
The controller signature says `ResponseEntity<AuthResponse>`, but it currently returns an empty body. Frontend code should not expect a token from registration unless the backend is changed.

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
  "roles": ["ROLE_CUSTOMER"]
}
```

Recommended frontend flow:

1. Submit login form to `/api/auth/login`.
2. Persist `token`, `username`, and `roles`.
3. Attach the token to future API requests.
4. Optionally call `GET /api/user/me` to hydrate the full profile.

### Password Reset Request

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

Notes:

- The reset code is sent through the backend email flow if mail is configured.
- If mail is not configured, the backend currently skips sending email and logs a warning.

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
  "enabled": true,
  "roles": ["ROLE_CUSTOMER"],
  "createdAt": "2026-03-22T21:00:00",
  "updatedAt": "2026-03-22T21:00:00"
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

Any field can be omitted.

### Admin User Endpoints

These require `ROLE_ADMIN` in practice:

- `GET /api/user`
- `GET /api/user/{userId}`
- `DELETE /api/user/{userId}`

Important:
`SecurityConfig` currently requires `ROLE_USER` for `/api/user/**`, while some controller methods also require `ROLE_ADMIN`. Frontend role checks should treat admin routes as admin-only.

## Room Endpoints

All room endpoints require bearer authentication.

### Create Room

`POST /api/rooms`

Request body:

```json
{
  "name": "General",
  "description": "Main room for all users",
  "type": "GROUP"
}
```

Known room type values come from the backend enum:

- `GROUP`
- `DIRECT`

Check `/docs` if you want to confirm the exact enum values currently exposed.

Example response shape:

```json
{
  "id": 1,
  "name": "General",
  "description": "Main room for all users",
  "members": [],
  "messages": [],
  "type": "GROUP",
  "createdById": 1,
  "createdAt": "2026-03-22T21:00:00",
  "updatedAt": "2026-03-22T21:00:00"
}
```

### Get Room Members

`GET /api/rooms/room/{roomId}`

Example response:

```json
[
  {
    "roomMemberId": 1,
    "roomId": 1,
    "userId": 1,
    "roomRole": "ADMIN",
    "joinedAt": "2026-03-22T21:00:00"
  }
]
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

## WebSocket Chat

The backend exposes a SockJS/STOMP endpoint:

- handshake endpoint: `/chat`
- app destination prefix: `/app`
- broker topic prefix: `/topic`

Current message flow:

- send to `/app/sendMessage/{roomId}`
- subscribe to `/topic/room/{roomId}`

Example using `@stomp/stompjs` with SockJS:

```ts
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const client = new Client({
  webSocketFactory: () => new SockJS("http://localhost:8080/chat"),
  reconnectDelay: 5000
});

client.onConnect = () => {
  client.subscribe("/topic/room/1", (frame) => {
    const message = JSON.parse(frame.body);
    console.log("received", message);
  });

  client.publish({
    destination: "/app/sendMessage/1",
    body: JSON.stringify({ content: "Hello room" })
  });
};

client.activate();
```

Important:
This WebSocket setup currently only allows origin `http://localhost:5173`.

## Recommended Frontend API Wrapper

```ts
const API_BASE_URL = "http://localhost:8080";

type ApiError = {
  status?: number;
  error?: string;
  message?: string;
  path?: string;
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
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
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw error ?? new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
```

## Suggested Frontend Session Shape

```ts
type Session = {
  token: string;
  username: string;
  roles: string[];
};
```

Example login handling:

```ts
type AuthResponse = {
  token: string;
  username: string;
  roles: string[];
};

async function login(username: string, password: string) {
  const session = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  localStorage.setItem("accessToken", session.token);
  localStorage.setItem("session", JSON.stringify(session));

  return session;
}
```

## Error Handling Expectations

For unauthorized requests, the backend returns `401` JSON responses from the auth entry point. Expect a shape similar to:

```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource",
  "path": "/api/user/me"
}
```

For authorization failures, expect `403 Forbidden`.

## Best Source Of Truth

For request and response shape, the most reliable source is the generated OpenAPI document:

- Swagger UI: `http://localhost:8080/docs`
- Raw schema: `http://localhost:8080/v3/api-docs`

If the markdown guide and `/docs` disagree, use `/docs`.
