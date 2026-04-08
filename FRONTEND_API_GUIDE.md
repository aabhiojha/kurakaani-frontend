# Frontend API Integration Guide

## Scope

This guide reflects the current backend implementation in this repository.

The backend currently exposes:

- JWT-based REST authentication
- User profile endpoints
- Room and room-membership endpoints
- Friend request endpoints
- STOMP over SockJS for live chat and typing indicators
- Real-time notifications via Redis pub/sub → WebSocket (`/user/queue/notifications`)
- OpenAPI docs at `/docs`

Useful backend references:

- `GET /docs`
- `GET /v3/api-docs`
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/auth/controller/AuthController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/user/controller/UserController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/room/controller/RoomController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/controller/FriendShipController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/controller/FriendShipController.java)
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
- `http://192.168.1.19:5173`
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

Response:

```http
200 OK
```

Note: The frontend should not expect a token from registration — call login separately after registering.

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
4. Use the same token in the STOMP `CONNECT` headers for WebSocket.

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

Response:

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

Response: updated `UserDto` (same shape as above).

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

These endpoints require `ADMIN` role:

- `GET /api/user` — list all users
- `GET /api/user/{userId}` — get user by ID
- `DELETE /api/user/{userId}` — delete user

## Friend Request Endpoints

All endpoints require bearer authentication.

### Send Friend Request

`POST /api/friend/request/{userId}`

Triggers a real-time notification to the recipient via WebSocket (see [Notifications](#notifications)).

Response:

```http
200 OK
```

### Respond to Friend Request

`POST /api/friend/respond/{userId}/{response}`

`{response}` is either `ACCEPT` or `REJECT`.

Triggers a real-time notification to the requester via WebSocket.

Response:

```http
200 OK
```

### Cancel Sent Friend Request

`POST /api/friend/{userId}/cancel`

Response:

```http
200 OK
```

### Unfriend

`POST /api/friend/{userId}/unfriend`

Response:

```http
200 OK
```

### Get Sent Friend Requests

`GET /api/friend/requests/sent`

Response:

```json
[
  {
    "id": 1,
    "requesterId": 1,
    "requesterName": "abhishek",
    "recipientId": 2,
    "recipientName": "ram",
    "status": "PENDING",
    "createdAt": "2026-03-23T16:00:00",
    "updatedAt": "2026-03-23T16:00:00"
  }
]
```

### Get Incoming Friend Requests

`GET /api/friend/requests`

Same shape as above, filtered to requests received by the current user.

### Get Friends

`GET /api/friend/friends`

Response:

```json
[
  {
    "userId": 2,
    "username": "ram",
    "profilePicUrl": "https://..."
  }
]
```

## Room Endpoints

All room endpoints require bearer authentication.

### Get Rooms

`GET /api/rooms`

Returns all rooms the authenticated user is a member of, each with the most recent message.

Response:

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

`recentMessage` is `null` for rooms with no messages yet.

### Get Messages For Room

`GET /api/rooms/room/{roomId}/message`

Response:

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

Media messages use `messageType` values `IMAGE` or `VIDEO` and return a presigned `mediaUrl`. Do not cache `mediaUrl` long-term as it expires.

### Upload Image or Video to Room

`POST /api/rooms/room/{roomId}/message/media`

Send `multipart/form-data` with:

- `file`: required image or video file
- `content`: optional caption

Response (`201 Created`):

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

### Search Messages in a Room

`GET /api/rooms/{roomId}/messages/search?text={query}`

Full-text search within a specific room. Only accessible to members of that room.

Response: same shape as `GET /api/rooms/room/{roomId}/message`, filtered by relevance.

### Search Messages Across All Rooms

`GET /api/rooms/messages/search?text={query}`

Full-text search across all rooms the authenticated user belongs to.

Response: same shape as above.

### Get Room Members

`GET /api/rooms/room/{roomId}`

Response:

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

### Get Addable Friends for a Room

`GET /api/rooms/room/{roomId}/add/friends`

Returns the current user's friends who are not already members of the given room. Use this to populate the "add members" picker.

Response: same shape as `GET /api/friend/friends`.

### Create Group Room

`POST /api/rooms/group`

Request body:

```json
{
  "name": "General",
  "description": "Main room",
  "type": "GROUP"
}
```

The authenticated user is automatically added as `ADMIN`.

Response (`201 Created`):

```json
{
  "id": 1,
  "name": "General",
  "description": "Main room",
  "members": [...],
  "messages": [],
  "type": "GROUP",
  "createdById": 1,
  "createdAt": "2026-03-23T16:00:00",
  "updatedAt": "2026-03-23T16:00:00"
}
```

Error responses:

- `409 Conflict` — a room with that name already exists for this user

### Create or Retrieve a DM

`POST /api/rooms/dm?userId={userId}`

If a DM between the two users already exists, it is returned instead of creating a new one. Call this unconditionally before opening a DM conversation.

Response (`201 Created`):

```json
{
  "id": 2,
  "name": "dm_1_3",
  "description": null,
  "members": [...],
  "messages": [],
  "type": "DM",
  "createdById": 1,
  "createdAt": "2026-03-27T10:00:00",
  "updatedAt": "2026-03-27T10:00:00"
}
```

Note: `name` is auto-generated as `dm_{minUserId}_{maxUserId}` — use the member list to display participant names.

### Upgrade a DM to a Group Room

`POST /api/rooms/room/{roomId}/group/create`

Converts an existing DM into a group by adding more users.

Request body:

```json
{
  "userIds": [4, 5]
}
```

Response (`200 OK`): updated `RoomDto` with `type: "GROUP"`.

### Update Group Room

`PATCH /api/rooms/room/{roomId}`

All fields are optional — send only what needs to change.

Request body:

```json
{
  "name": "New Name",
  "description": "Updated description",
  "userId": [4, 5]
}
```

Response (`200 OK`): updated `RoomDto`.

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

The backend exposes a STOMP-over-SockJS endpoint.

Broker configuration:

- Handshake endpoint: `/ws`
- App destination prefix: `/app`
- Broker prefixes: `/topic` (broadcast), `/queue` (user-specific)
- User destination prefix: `/user`

### Connecting

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
  // subscribe to room messages
  client.subscribe(`/topic/rooms/${roomId}`, (frame) => {
    const message = JSON.parse(frame.body);
  });

  // subscribe to typing indicators
  client.subscribe(`/topic/rooms/${roomId}/typing`, (frame) => {
    const event = JSON.parse(frame.body);
    // { userId, userName, typing }
  });

  // subscribe to notifications (see Notifications section)
  client.subscribe(`/user/queue/notifications`, (frame) => {
    const notification = JSON.parse(frame.body);
  });
};

client.activate();
```

### Send Text Message

Publish to `/app/chat.send/{roomId}`:

```ts
client.publish({
  destination: `/app/chat.send/${roomId}`,
  body: JSON.stringify({ content: "hello" })
});
```

Incoming message payload on `/topic/rooms/{roomId}`:

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

### Send Typing Indicator

Publish to `/app/chat.typing/{roomId}`:

```ts
client.publish({
  destination: `/app/chat.typing/${roomId}`,
  body: JSON.stringify({ userId: 1, userName: "abhishek", typing: true })
});
```

Incoming typing event on `/topic/rooms/{roomId}/typing`:

```json
{
  "userId": 1,
  "userName": "abhishek",
  "typing": true
}
```

## Notifications

After connecting via STOMP, subscribe to:

```
/user/queue/notifications
```

This channel receives real-time push notifications for friend requests and new messages. Notifications are delivered via Redis pub/sub — every app instance that has the user's WebSocket connection will forward the message.

All notifications share the same envelope:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FRIEND_REQUEST | DM | ROOM",
  "timestamp": "2026-04-08T10:00:00Z",
  "payload": { ... }
}
```

### `FRIEND_REQUEST` payload

Sent when a friend request is received, accepted, or declined.

```json
{
  "requestId": "42",
  "event": "RECEIVED | ACCEPTED | DECLINED",
  "senderName": "ram",
  "senderAvatar": "https://..."
}
```

### `DM` payload

Sent to the other participant when a new message arrives in a DM room.

```json
{
  "messageId": "10",
  "roomId": "2",
  "preview": "hey, what's up?",
  "mediaType": null
}
```

### `ROOM` payload

Sent to all room members (except the sender) when a new message arrives in a group room.

```json
{
  "roomId": "1",
  "roomName": "General",
  "event": "NEW_MESSAGE",
  "preview": "hey everyone"
}
```

### Example notification handler

```ts
client.subscribe("/user/queue/notifications", (frame) => {
  const notification = JSON.parse(frame.body);

  switch (notification.type) {
    case "FRIEND_REQUEST":
      handleFriendRequestNotification(notification.payload);
      break;
    case "DM":
      handleDmNotification(notification.payload);
      break;
    case "ROOM":
      handleRoomNotification(notification.payload);
      break;
  }
});
```

## Known Backend Caveats

- Registration returns no auth payload — call login separately.
- `mediaUrl` in message responses is presigned and expires — do not cache it long-term.
