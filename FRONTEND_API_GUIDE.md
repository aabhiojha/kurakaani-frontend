# Frontend API Integration Guide

This guide reflects the backend currently in this repository.

What the frontend needs to integrate:

- JWT-based REST auth
- user profile APIs
- friend request APIs
- room and membership APIs
- STOMP over SockJS for live chat
- user-targeted websocket notifications

Useful backend references:

- [AuthController.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java)
- [UserController.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java)
- [FriendShipController.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/controller/FriendShipController.java)
- [RoomController.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java)
- [MessageController.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/message/controller/MessageController.java)
- [WebSocketConfig.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java)
- [SecurityConfig.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/common/config/SecurityConfig.java)
- [application.yaml](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/resources/application.yaml)

## Base URL

Local backend:

```ts
export const API_BASE_URL = "http://localhost:8080";
```

Swagger / OpenAPI:

- `GET /docs`
- `GET /v3/api-docs`

## Cross-Origin and Auth

Allowed frontend origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://192.168.1.19:5173`
- `https://kurakaani.me`

REST requests use JWT bearer auth:

```http
Authorization: Bearer <token>
```

The login response is:

```json
{
  "token": "<jwt>",
  "username": "abhishek",
  "roles": ["ROLE_USER"]
}
```

Recommended session state:

```ts
type Session = {
  token: string;
  username: string;
  roles: string[];
};
```

## Suggested API Wrapper

Use a single wrapper so all protected requests attach the token consistently.

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

## Authentication

### Register

`POST /api/auth/register`

Request:

```json
{
  "username": "abhishek",
  "password": "secret123",
  "email": "abhishek@example.com"
}
```

Response:

```http
200 OK
```

Important:

- The controller currently returns no response body.
- Do not expect a JWT from registration.
- After registration, call login if you want an authenticated session.

### Login

`POST /api/auth/login`

Request:

```json
{
  "username": "abhishek",
  "password": "secret123"
}
```

Response:

```json
{
  "token": "<jwt>",
  "username": "abhishek",
  "roles": ["ROLE_USER"]
}
```

Frontend flow:

1. Call login.
2. Store the token.
3. Attach it to REST requests.
4. Reuse it in STOMP `CONNECT` headers.

### Password Reset

`POST /api/auth/password-reset`

Request:

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

Request:

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

## Users

### Get Current User

`GET /api/user/me`

Response shape:

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

Request:

```json
{
  "userName": "abhishek-new",
  "email": "new@example.com"
}
```

### Upload Profile Picture

`POST /api/user/profilePic/upload`

Use `multipart/form-data` with:

- `file`: image file

Response:

```http
200 OK
```

Fetch `/api/user/me` after upload if you need the latest `profileImageUrl`.

### Admin / User Directory

`GET /api/user`

`GET /api/user/{userId}`

`DELETE /api/user/{userId}`

Current security config gates `/api/user/**` behind `ROLE_USER`.

## Friend Requests

All friend endpoints are authenticated and use the bearer token.

### Send Request

`POST /api/friend/request/{userId}`

### Respond To Request

`POST /api/friend/respond/{userId}/{response}`

Where `response` is:

- `ACCEPT`
- `REJECT`

### Cancel Request

`POST /api/friend/{userId}/cancel`

### Unfriend

`POST /api/friend/{userId}/unfriend`

### Sent Requests

`GET /api/friend/requests/sent`

Response item shape:

```json
{
  "id": 1,
  "requesterId": 2,
  "requesterName": "ram",
  "recipientId": 4,
  "recipientName": "sita",
  "status": "PENDING",
  "createdAt": "2026-03-23T16:00:00",
  "updatedAt": "2026-03-23T16:00:00"
}
```

### Incoming Requests

`GET /api/friend/requests`

### Friends List

`GET /api/friend/friends`

Response item shape:

```json
{
  "userId": 4,
  "username": "sita",
  "profilePicUrl": "https://..."
}
```

### Friend WebSocket Notifications

The backend sends friend events to:

- `/user/queue/notifications`

Notification payload:

```json
{
  "type": "FRIEND_REQUEST_RECEIVED",
  "payload": { }
}
```

The `payload` is typically a `FriendShipDto` instance serialized as JSON.

Event types:

- `FRIEND_REQUEST_RECEIVED`
- `FRIEND_REQUEST_ACCEPTED`
- `FRIEND_REQUEST_REJECTED`
- `FRIEND_REMOVED`

## Rooms

### Get My Rooms

`GET /api/rooms`

Response shape:

```json
[
  {
    "id": 1,
    "name": "General",
    "description": "Main room",
    "roomImageUrl": "https://...",
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

If the most recent message is media-only, the backend may replace the preview text with:

- `Sent an image`
- `Sent a video`

### Upload Room Image

`POST /api/rooms/room/{roomId}/image/upload`

Use `multipart/form-data` with:

- `file`: image file

Response:

```http
200 OK
```

Fetch `GET /api/rooms` or `GET /api/rooms/room/{roomId}` after upload if you need the latest `roomImageUrl`.

### Get Room Messages

`GET /api/rooms/room/{roomId}/message`

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

Important:

- `mediaUrl` is resolved by the backend.
- `profileImageUrl` is also resolved before the response is returned.

### Get Room Members

`GET /api/rooms/room/{roomId}`

Response shape:

```json
[
  {
    "roomMemberId": 1,
    "roomId": 1,
    "userId": 2,
    "username": "ram",
    "profileImageUrl": "https://...",
    "roomRole": "ADMIN",
    "joinedAt": "2026-03-23T16:00:00"
  }
]
```

### Get Addable Friends

`GET /api/rooms/room/{roomId}/add/friends`

Returns the current user's friends who are not already in the room.

### Create Group Room

`POST /api/rooms/group`

Request:

```json
{
  "name": "General",
  "description": "Main room",
  "type": "GROUP"
}
```

Response:

```json
{
  "id": 1,
  "name": "General",
  "description": "Main room",
  "members": [],
  "messages": [],
  "type": "GROUP",
  "createdById": 1,
  "createdAt": "2026-03-23T16:00:00",
  "updatedAt": "2026-03-23T16:00:00"
}
```

The authenticated user is added as `ADMIN`.

### Create Or Open DM

`POST /api/rooms/dm?userId={userId}`

If the DM already exists, the backend returns it instead of creating a duplicate.

### Upgrade DM To Group

`POST /api/rooms/room/{roomId}/group/create`

Request:

```json
{
  "userIds": [4, 5]
}
```

### Update Room Details

`PATCH /api/rooms/room/{roomId}`

Request:

```json
{
  "name": "New Name",
  "description": "Updated description",
  "userId": [4, 5]
}
```

Notes:

- `name` and `description` are optional.
- `userId` is the list of user IDs to add.

### Add Users To Room

`POST /api/rooms/room/{roomId}/add`

Request:

```json
{
  "userIds": [4, 5]
}
```

### Remove Members From Room

`POST /api/rooms/room/{roomId}/remove`

Request:

```json
{
  "membersId": [2, 3]
}
```

Important:

- This endpoint is currently unsafe in the backend.
- The current implementation calls `roomRepository.deleteAllById(deleteIds)` instead of removing room-member links.
- Do not use it in production until the backend is corrected.

## Messages

### Send Text Message

Text messages are sent over STOMP, not REST.

- connect to `/ws`
- publish to `/app/chat.send/{roomId}`
- subscribe to `/topic/rooms/{roomId}`

Payload:

```json
{
  "roomId": 1,
  "content": "hello"
}
```

### Upload Image Or Video

`POST /api/rooms/room/{roomId}/message/media`

Use `multipart/form-data` with:

- `file`: required image or video file
- `content`: optional caption

The backend accepts:

- `image/*`
- `video/*`

Server-side file limit:

- 10 MB

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

The same payload is broadcast to `/topic/rooms/{roomId}`.

### Search Messages In One Room

`GET /api/rooms/{roomId}/messages/search?text=hello`

### Search Messages Across Rooms

`GET /api/rooms/messages/search?text=hello`

## WebSocket Setup

STOMP endpoint:

- `/ws`

Broker prefixes:

- application prefix: `/app`
- broker prefix: `/topic`
- user prefix: `/user`

Allowed frontend origins for websocket:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://kurakaani.me`
- `http://192.168.1.19:5173`

### Minimal Client

```ts
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export function createChatClient(token: string) {
  return new Client({
    webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 5000
  });
}
```

### Connect Flow

1. Load the JWT from storage.
2. Create the SockJS connection.
3. Send `Authorization: Bearer <jwt>` in STOMP `CONNECT` headers.
4. Subscribe to room topics.

### Room Subscription

Subscribe to:

- `/topic/rooms/{roomId}`

You will receive message DTOs with this shape:

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

### Typing Indicator

Send typing events to:

- `/app/chat.typing/{roomId}`

The backend republishes them to:

- `/topic/rooms/{roomId}/typing`

Payload shape:

```json
{
  "userId": 2,
  "userName": "ram",
  "typing": true
}
```

## Frontend Integration Order

Recommended implementation order:

1. Auth storage and token handling
2. REST wrapper
3. User profile page
4. Rooms list and room details
5. STOMP chat stream
6. Media upload
7. Friend request notifications

## Known Backend Caveats

- `POST /api/auth/register` currently returns `200 OK` with no body.
- `POST /api/rooms/room/{roomId}/remove` is unsafe as implemented.
- WebSocket auth depends on the STOMP `CONNECT` header being present and valid.
