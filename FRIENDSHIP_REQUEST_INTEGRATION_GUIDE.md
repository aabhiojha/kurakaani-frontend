# Friendship Request Frontend Integration Guide

This guide covers the friend-request flow exposed by the backend in this repository.

Primary backend references:

- [FriendShipController.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/controller/FriendShipController.java)
- [FriendRequestServiceImpl.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/service/FriendRequestServiceImpl.java)
- [FriendShipRepository.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/repository/FriendShipRepository.java)
- [NotificationService.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/service/NotificationService.java)
- [WsResponseType.java](/home/abhishek/IdeaProjects/kurakaani/kurakani-monolith/src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/model/enums/WsResponseType.java)

## Overview

The friendship feature is a stateful request/response workflow:

1. A user sends a friend request to another user.
2. The recipient sees the request in their incoming requests list and via websocket.
3. The recipient accepts or rejects the request.
4. The requester receives a websocket notification about the outcome.
5. Either user can later unfriend.

The backend uses JWT authentication for all friend routes.

Required header:

```http
Authorization: Bearer <token>
```

## Base Route

All endpoints are under:

```text
/api/friend
```

## Data Shapes

### FriendShipDto

Used for sent and incoming requests, and also as the payload for websocket notifications.

```json
{
  "id": 1,
  "requesterId": 10,
  "requesterName": "ram",
  "recipientId": 20,
  "recipientName": "sita",
  "status": "PENDING",
  "createdAt": "2026-04-02T20:15:00",
  "updatedAt": "2026-04-02T20:15:00"
}
```

### FriendsDto

Used for the current user’s accepted friends list.

```json
{
  "userId": 20,
  "username": "sita",
  "profilePicUrl": "https://..."
}
```

### WebSocketNotification

Friend websocket messages are wrapped like this:

```json
{
  "type": "FRIEND_REQUEST_RECEIVED",
  "payload": {
    "id": 1,
    "requesterId": 10,
    "requesterName": "ram",
    "recipientId": 20,
    "recipientName": "sita",
    "status": "PENDING"
  }
}
```

## REST Endpoints

### Send Friend Request

`POST /api/friend/request/{userId}`

Path parameter:

- `userId`: the recipient’s user id

Behavior:

- Creates a pending request from the authenticated user to the target user.
- Rejects self-requests.
- Rejects duplicates.
- Sends a websocket notification to the recipient.

Success response:

```http
200 OK
```

Frontend note:

- Disable the button while the request is in flight.
- After success, optimistically move the target user into a "requested" state or refresh the requests list.

### Respond To Friend Request

`POST /api/friend/respond/{userId}/{response}`

Path parameters:

- `userId`: the requester’s user id
- `response`: `ACCEPT` or `REJECT`

Behavior:

- The authenticated user is the recipient who is responding.
- The backend looks up a pending request from `{userId}` to the current user.
- If no pending request exists, the backend returns `404 Friend request not found`.
- If accepted, the friendship becomes `ACCEPTED`.
- If rejected, the friendship becomes `REJECTED`.
- A websocket notification is sent to the original requester.

Success response:

```http
200 OK
```

Important:

- Use `ACCEPT` and `REJECT`.
- Do not send `ACCEPTED` or `REJECTED` in the path.

Example:

```bash
curl -X POST \
  "http://localhost:8080/api/friend/respond/20/ACCEPT" \
  -H "Authorization: Bearer <token>"
```

### Cancel Friend Request

`POST /api/friend/{userId}/cancel`

Path parameter:

- `userId`: the recipient’s user id

Behavior:

- Cancels a pending request sent by the authenticated user.
- No websocket notification is currently emitted for cancel.

Success response:

```http
200 OK
```

### Unfriend

`POST /api/friend/{userId}/unfriend`

Path parameter:

- `userId`: the other user’s id

Behavior:

- Removes an accepted friendship entry.
- No websocket notification is currently emitted from the backend for this route.

Success response:

```http
200 OK
```

### Sent Requests

`GET /api/friend/requests/sent`

Returns pending requests sent by the authenticated user.

Response:

```json
[
  {
    "id": 1,
    "requesterId": 10,
    "requesterName": "ram",
    "recipientId": 20,
    "recipientName": "sita",
    "status": "PENDING",
    "createdAt": "2026-04-02T20:15:00",
    "updatedAt": "2026-04-02T20:15:00"
  }
]
```

### Incoming Requests

`GET /api/friend/requests`

Returns pending requests received by the authenticated user.

### Friends List

`GET /api/friend/friends`

Returns accepted friends of the authenticated user.

## WebSocket Notifications

Friend notifications use STOMP over SockJS.

### Destination

Subscribe to:

```text
/user/queue/notifications
```

### Event Types

Possible notification types:

- `FRIEND_REQUEST_RECEIVED`
- `FRIEND_REQUEST_ACCEPTED`
- `FRIEND_REQUEST_REJECTED`
- `FRIEND_REMOVED`

### Client Setup

Send the JWT in the STOMP `CONNECT` headers:

```ts
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export function createFriendClient(token: string) {
  return new Client({
    webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 5000
  });
}
```

### Subscribe Example

```ts
client.onConnect = () => {
  client.subscribe("/user/queue/notifications", (frame) => {
    const notification = JSON.parse(frame.body);
    console.log(notification.type, notification.payload);
  });
};
```

## Frontend State Model

A practical frontend model is:

```ts
type FriendshipStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED";

type FriendRequestItem = {
  id: number;
  requesterId: number;
  requesterName: string;
  recipientId: number;
  recipientName: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
};

type FriendSummary = {
  userId: number;
  username: string;
  profilePicUrl: string | null;
};
```

Suggested UI buckets:

- `Suggested friends`
- `Sent requests`
- `Incoming requests`
- `Friends`

## Recommended UI Flow

### Send Request Button

1. User clicks "Add friend".
2. POST `/api/friend/request/{userId}`.
3. On success, move the row/card into a "requested" or "pending" state.
4. If the API returns `409`, show "request already exists".
5. If the API returns `400`, show "cannot send request to yourself" or another validation message.

### Incoming Request Card

For each incoming request:

1. Show requester name and avatar.
2. Show `Accept` and `Reject` actions.
3. Call `/api/friend/respond/{requesterId}/ACCEPT` or `/REJECT`.
4. On success, remove the card from incoming requests.
5. Update the friends list when the request is accepted.

### Live Updates

When a websocket notification arrives:

- `FRIEND_REQUEST_RECEIVED`: append to incoming requests.
- `FRIEND_REQUEST_ACCEPTED`: append or move the user into friends.
- `FRIEND_REQUEST_REJECTED`: remove from sent requests.
- `FRIEND_REMOVED`: remove from friends.

## Error Handling

Common responses:

- `400 Bad Request`
- `401 Unauthorized`
- `404 Not Found`
- `409 Conflict`
- `500 Internal Server Error`

Recommended handling:

- `400`: show a validation message from the server if present.
- `401`: clear session and redirect to login.
- `404`: treat as stale UI state and refresh the friend lists.
- `409`: disable the send action and refresh the current request state.
- `500`: show a generic failure message and log the payload for debugging.

## Practical Notes

- `userId` in the respond endpoint refers to the requester, not the recipient.
- The authenticated user is always the receiver when responding.
- The backend now returns `404 Friend request not found` if no pending request exists.
- The backend currently emits websocket events only for send/accept/reject/remove flows through `NotificationService`.

## Minimal Fetch Helpers

```ts
const API_BASE_URL = "http://localhost:8080";

async function friendFetch<T>(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw await response.json().catch(() => new Error(`HTTP ${response.status}`));
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}
```

## Summary

Use REST for request actions and list loading, and use `/user/queue/notifications` for live updates. The key frontend rule is to treat the request as directional:

- requester sends to recipient
- recipient accepts or rejects the requester
- both sides receive updates through the UI and websocket notifications
