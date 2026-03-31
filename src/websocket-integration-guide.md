# Kurakani WebSocket Client Integration Guide

## Dependencies

```bash
npm install @stomp/stompjs sockjs-client
```

---

## 1. Connecting

The server uses STOMP over SockJS at `/ws`. Authentication is via JWT on the CONNECT frame.

```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BASE_URL = 'http://localhost:8080'; // or https://kurakaani.me

function createStompClient(jwtToken) {
    const client = new Client({
        webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),

        connectHeaders: {
            Authorization: `Bearer ${jwtToken}`, // required — server rejects without this
        },

        onConnect: () => {
            console.log('Connected');
            // set up subscriptions here (see below)
        },

        onDisconnect: () => {
            console.log('Disconnected');
        },

        onStompError: (frame) => {
            console.error('STOMP error', frame.headers['message']);
        },

        reconnectDelay: 5000, // auto-reconnect after 5s
    });

    client.activate();
    return client;
}
```

> **Important:** All subscriptions must be set up inside `onConnect`. If the connection drops and reconnects, `onConnect` fires again — re-subscribe there.

---

## 2. Subscribing to a Room's Messages

Subscribe when the user opens a room. Unsubscribe when they leave.

```javascript
let roomSubscription = null;

function joinRoom(client, roomId) {
    // unsubscribe from previous room first
    roomSubscription?.unsubscribe();

    roomSubscription = client.subscribe(
        `/topic/rooms/${roomId}`,
        (frame) => {
            const message = JSON.parse(frame.body);
            handleIncomingMessage(message);
        }
    );
}

function handleIncomingMessage(message) {
    // MessageDto shape:
    // {
    //   id: number,
    //   senderId: number,
    //   roomId: number,
    //   content: string | null,
    //   messageType: 'TEXT' | 'IMAGE' | 'VIDEO',
    //   mediaUrl: string | null,
    //   mediaContentType: string | null,
    //   mediaFileName: string | null,
    //   isEdited: boolean,
    //   isDeleted: boolean,
    //   createdAt: string,   // ISO LocalDateTime: "2026-03-30T14:22:00"
    //   updatedAt: string
    // }

    if (message.messageType === 'TEXT') {
        renderTextMessage(message);
    } else if (message.messageType === 'IMAGE' || message.messageType === 'VIDEO') {
        renderMediaMessage(message); // use message.mediaUrl directly
    }
}
```

---

## 3. Sending a Text Message

```javascript
function sendTextMessage(client, roomId, content) {
    client.publish({
        destination: `/app/chat.send/${roomId}`,
        body: JSON.stringify({
            roomId: roomId,  // MessageRequest fields
            content: content,
        }),
    });
}
```

> The server validates room membership. If the user is not a member, the message is silently dropped server-side (no error frame is sent back currently).

---

## 4. Sending a Media Message (Image / Video)

Media is **not** sent over WebSocket — use a regular REST upload. The server broadcasts the resulting `MessageDto` to the room's WebSocket topic automatically.

```javascript
async function sendMediaMessage(roomId, file, caption, jwtToken) {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('content', caption);

    const res = await fetch(`${BASE_URL}/api/rooms/room/${roomId}/message/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
        body: form,
    });

    if (!res.ok) throw new Error('Upload failed');
    // No need to handle the response — the MessageDto will arrive
    // on /topic/rooms/{roomId} via WebSocket for all subscribers including sender
}
```

---

## 5. Typing Indicators

### Subscribing

```javascript
let typingSubscription = null;
const typingUsers = new Map(); // userId -> { userName, timerId }

function subscribeToTyping(client, roomId, currentUserId) {
    typingSubscription?.unsubscribe();

    typingSubscription = client.subscribe(
        `/topic/rooms/${roomId}/typing`,
        (frame) => {
            const event = JSON.parse(frame.body);
            // { userId: number, userName: string, typing: boolean }

            if (event.userId === currentUserId) return; // ignore own events

            if (event.typing) {
                clearTimeout(typingUsers.get(event.userId)?.timerId);
                // auto-expire in case "typing: false" never arrives (e.g. tab closed)
                const timerId = setTimeout(() => {
                    typingUsers.delete(event.userId);
                    renderTypingIndicator(typingUsers);
                }, 3000);
                typingUsers.set(event.userId, { userName: event.userName, timerId });
            } else {
                clearTimeout(typingUsers.get(event.userId)?.timerId);
                typingUsers.delete(event.userId);
            }

            renderTypingIndicator(typingUsers);
        }
    );
}

function renderTypingIndicator(typingUsers) {
    if (typingUsers.size === 0) {
        hideTypingBanner();
        return;
    }
    const names = [...typingUsers.values()].map(u => u.userName);
    const text = names.length === 1
        ? `${names[0]} is typing...`
        : `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are typing...`;
    showTypingBanner(text);
}
```

### Sending (debounced)

```javascript
let typingTimeout = null;

function onInputChange(client, roomId, currentUserId, currentUserName) {
    if (!typingTimeout) {
        // send "started typing" only once per burst
        client.publish({
            destination: `/app/chat.typing/${roomId}`,
            body: JSON.stringify({ userId: currentUserId, userName: currentUserName, typing: true }),
        });
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        client.publish({
            destination: `/app/chat.typing/${roomId}`,
            body: JSON.stringify({ userId: currentUserId, userName: currentUserName, typing: false }),
        });
        typingTimeout = null;
    }, 2000);
}

// Wire it up:
inputElement.addEventListener('input', () => {
    onInputChange(client, roomId, currentUserId, currentUserName);
});

// Also send "stopped" when the message is actually sent
function sendTextMessage(client, roomId, content, currentUserId, currentUserName) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
    client.publish({
        destination: `/app/chat.typing/${roomId}`,
        body: JSON.stringify({ userId: currentUserId, userName: currentUserName, typing: false }),
    });

    client.publish({
        destination: `/app/chat.send/${roomId}`,
        body: JSON.stringify({ roomId, content }),
    });
}
```

---

## 6. Friend Request Notifications

These are user-specific — the server routes them using STOMP's user destination feature. The actual subscription path the client uses is `/user/queue/notifications`; the `/user/` prefix is resolved by the server to the current connected user.

```javascript
function subscribeToNotifications(client) {
    client.subscribe('/user/queue/notifications', (frame) => {
        const notification = JSON.parse(frame.body);
        handleNotification(notification);
    });
}

function handleNotification(notification) {
    // notification shape:
    // {
    //   type: 'FRIEND_REQUEST_RECEIVED' | 'FRIEND_REQUEST_ACCEPTED'
    //        | 'FRIEND_REQUEST_REJECTED' | 'FRIEND_REMOVED',
    //   payload: FriendShipDto
    // }

    switch (notification.type) {
        case 'FRIEND_REQUEST_RECEIVED':
            showToast(`${notification.payload.requesterUsername} sent you a friend request`);
            break;
        case 'FRIEND_REQUEST_ACCEPTED':
            showToast(`${notification.payload.recipientUsername} accepted your request`);
            break;
        case 'FRIEND_REQUEST_REJECTED':
            showToast('Your friend request was declined');
            break;
        case 'FRIEND_REMOVED':
            showToast('A friend removed you');
            break;
    }
}
```

---

## 7. Full Setup Example

```javascript
let stompClient = null;

function connect(jwtToken, currentUserId, currentUserName) {
    stompClient = new Client({
        webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
        connectHeaders: { Authorization: `Bearer ${jwtToken}` },

        onConnect: () => {
            subscribeToNotifications(stompClient);
            // join the active room if one is already open
            if (activeRoomId) {
                joinRoom(stompClient, activeRoomId);
                subscribeToTyping(stompClient, activeRoomId, currentUserId);
            }
        },

        reconnectDelay: 5000,
    });

    stompClient.activate();
}

function disconnect() {
    clearTimeout(typingTimeout);
    stompClient?.deactivate();
}
```

---

## Quick Reference

| Action | Direction | Destination |
|---|---|---|
| Connect | client → server | `SockJS /ws` (JWT in header) |
| Send text message | client → server | `/app/chat.send/{roomId}` |
| Receive room messages | server → client | `/topic/rooms/{roomId}` |
| Send typing event | client → server | `/app/chat.typing/{roomId}` |
| Receive typing events | server → client | `/topic/rooms/{roomId}/typing` |
| Receive notifications | server → client | `/user/queue/notifications` |
| Upload media | REST POST | `/api/rooms/room/{roomId}/message/media` |
