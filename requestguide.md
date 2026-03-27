# Friend Request API Guide

## Scope

This guide documents the current friend request and friendship behavior implemented in this repository.

Base path:

```text
/api/friend
```

All endpoints require bearer authentication.

```http
Authorization: Bearer <token>
```

Useful backend references:

- `GET /docs`
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/controller/FriendShipController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/controller/FriendShipController.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/service/FriendRequestServiceImpl.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/service/FriendRequestServiceImpl.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/service/NotificationService.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/friendRequest/service/NotificationService.java)

## Friendship DTO

All list endpoints and websocket notification payloads use this shape:

```json
{
  "id": 1,
  "requesterId": 2,
  "recipientId": 5,
  "status": "PENDING",
  "createdAt": "2026-03-26T18:00:00",
  "updatedAt": "2026-03-26T18:00:00"
}
```

Possible `status` values:

- `PENDING`
- `ACCEPTED`
- `REJECTED`

## REST Endpoints

### Send Friend Request

`POST /api/friend/request/{userId}`

Sends a friend request from the authenticated user to `userId`.

Response:

```http
200 OK
```

Notes:

- Sending a request to yourself is rejected.
- The backend does not currently check for an existing reverse-direction request before saving.
- Duplicate requests in the same direction can fail due to the unique database constraint on `(requester_id, recipient_id)`.

### Respond To Friend Request

`POST /api/friend/respond/{userId}/{response}`

`userId` is the requester user id.

`response` must be one of:

- `ACCEPT`
- `REJECT`

Examples:

```text
POST /api/friend/respond/2/ACCEPT
POST /api/friend/respond/2/REJECT
```

Response:

```http
200 OK
```

Behavior:

- The authenticated user is treated as the recipient responding to a pending request sent by `userId`.
- The friendship row is updated to `ACCEPTED` or `REJECTED`.

### Cancel Sent Friend Request

`POST /api/friend/{userId}/cancel`

Cancels a pending request that the authenticated user previously sent to `userId`.

Response:

```http
200 OK
```

Behavior:

- The backend deletes the friendship row entirely.

### Unfriend User

`POST /api/friend/{userId}/unfriend`

Response:

```http
200 OK
```

Current behavior:

- The backend looks up a friendship only where the authenticated user is the original requester and `userId` is the recipient.
- That means unfriending may fail if the accepted friendship was originally created in the opposite direction.

### Get Incoming Friend Requests

`GET /api/friend/requests`

Returns pending requests where the authenticated user is the recipient.

Response:

```json
[
  {
    "id": 1,
    "requesterId": 2,
    "recipientId": 5,
    "status": "PENDING",
    "createdAt": "2026-03-26T18:00:00",
    "updatedAt": "2026-03-26T18:00:00"
  }
]
```

### Get Sent Friend Requests

`GET /api/friend/requests/sent`

Returns pending requests where the authenticated user is the requester.

Response:

```json
[
  {
    "id": 1,
    "requesterId": 5,
    "recipientId": 8,
    "status": "PENDING",
    "createdAt": "2026-03-26T18:00:00",
    "updatedAt": "2026-03-26T18:00:00"
  }
]
```

### Get Friends

`GET /api/friend/friends`

Returns accepted friendship rows involving the authenticated user.

Response:

```json
[
  {
    "id": 4,
    "requesterId": 2,
    "recipientId": 5,
    "status": "ACCEPTED",
    "createdAt": "2026-03-25T15:00:00",
    "updatedAt": "2026-03-25T15:10:00"
  }
]
```

Frontend note:

- The API returns raw friendship rows, not a normalized `friendUser` object.
- To render a friend list, compare `requesterId` and `recipientId` against the current authenticated user id and derive the other user id client-side.

## Realtime Notifications

Friend request notifications are delivered over the existing STOMP websocket setup.

Subscribe to:

```text
/user/queue/notifications
```

Notification shape:

```json
{
  "type": "FRIEND_REQUEST_RECEIVED",
  "payload": {
    "id": 1,
    "requesterId": 2,
    "recipientId": 5,
    "status": "PENDING",
    "createdAt": "2026-03-26T18:00:00",
    "updatedAt": "2026-03-26T18:00:00"
  }
}
```

Possible websocket `type` values:

- `FRIEND_REQUEST_RECEIVED`
- `FRIEND_REQUEST_ACCEPTED`
- `FRIEND_REQUEST_REJECTED`
- `FRIEND_REMOVED`

Current behavior:

- Sending a friend request notifies the recipient.
- Accepting a friend request notifies the original requester.
- Rejecting a friend request notifies the original requester.
- There is notification infrastructure for `FRIEND_REMOVED`, but the current unfriend flow does not call it.

## Database Constraints

The `friendships` table has a unique constraint on:

```text
(requester_id, recipient_id)
```

And the entity also enforces:

```text
requester_id != recipient_id
```

This means:

- the same directional request cannot be inserted twice
- self-friend requests are invalid
- reverse-direction duplicates are not prevented by the database constraint alone

## Known Backend Caveats

- Send request does not proactively check for an existing friendship before insert, so duplicates may surface as database errors.
- Reverse-direction duplicates are possible as separate rows unless blocked in application logic.
- Unfriend only works reliably when the authenticated user was the original requester.
- Cancel and unfriend delete the row instead of returning a richer response body.
- Friend list responses only contain ids, not usernames or profile images.

---

# Room Messages API Guide

## Scope

This section documents room message retrieval behavior used by the chat UI.

Base path:

```text
/api/rooms
```

All endpoints require bearer authentication.

```http
Authorization: Bearer <token>
```

## Get Room Messages

`GET /api/rooms/room/{roomId}/message`

Example request:

```bash
curl -X 'GET' \
  'http://localhost:8080/api/rooms/room/1/message' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer <token>'
```

Example response:

```json
[
  {
    "id": 1,
    "roomId": 1,
    "userInfo": {
      "id": 1,
      "username": "abhishek",
      "profileImageUrl": "http://127.0.0.1:9000/..."
    },
    "content": "🔥",
    "messageType": "TEXT",
    "mediaUrl": null,
    "mediaContentType": null,
    "mediaFileName": null,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-25T16:11:13.693379",
    "updatedAt": "2026-03-25T16:11:13.693414"
  },
  {
    "id": 6,
    "roomId": 1,
    "userInfo": {
      "id": 1,
      "username": "abhishek",
      "profileImageUrl": "http://127.0.0.1:9000/..."
    },
    "content": null,
    "messageType": "IMAGE",
    "mediaUrl": "http://127.0.0.1:9000/...",
    "mediaContentType": "image/webp",
    "mediaFileName": "original-71debcd9a46a19f85a75ef2f31e3f87e.webp",
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-26T23:12:46.877745",
    "updatedAt": "2026-03-26T23:12:46.877757"
  }
]
```

### Message DTO

Each item in the array follows this shape:

```json
{
  "id": 0,
  "roomId": 0,
  "userInfo": {
    "id": 0,
    "username": "string",
    "profileImageUrl": "string | null"
  },
  "content": "string | null",
  "messageType": "TEXT | IMAGE | VIDEO",
  "mediaUrl": "string | null",
  "mediaContentType": "string | null",
  "mediaFileName": "string | null",
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp"
}
```

### Frontend Mapping Notes

- `content` can be `null` for media-only messages.
- `profileImageUrl` can be `null` for users without an avatar.
- `messageType` should drive rendering:
  - `TEXT`: render `content`.
  - `IMAGE`: render image from `mediaUrl`.
  - `VIDEO`: render video from `mediaUrl`.
- Use `createdAt` for message timestamp display and ordering.
- Signed media URLs include expiration query params and should be consumed as-is.
