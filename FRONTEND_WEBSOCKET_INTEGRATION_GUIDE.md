# Frontend WebSocket Integration Guide

## Scope

This guide reflects the current backend implementation in this repository as of 2026-03-23.

Use REST for:

- login and registration
- loading current user
- creating rooms
- loading room members

Use WebSocket for:

- sending live messages
- receiving new messages in a room

Current backend references:

- [src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java](src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/common/security/WebSocketAuthChannelInterceptor.java](src/main/java/com/abhishekojha/kurakanimonolith/common/security/WebSocketAuthChannelInterceptor.java)
- [src/main/java/com/abhishekojha/kurakanimonolith/modules/message/controller/MessageController.java](src/main/java/com/abhishekojha/kurakanimonolith/modules/message/controller/MessageController.java)

## Current WebSocket Contract

The backend currently exposes:

- handshake endpoint: `/ws`
- application destination prefix: `/app`
- broker topic prefix: `/topic`

For chat messaging:

- publish to `/app/chat.send/{roomId}`
- subscribe to `/topic/rooms/{roomId}`

Authentication is required on the STOMP `CONNECT` frame through the `Authorization` header.

Format:

```http
Authorization: Bearer <jwt>
```

## Recommended Frontend Flow

1. Log the user in with REST and store the JWT.
2. Load the initial room data over REST.
3. When the user opens a room, connect the STOMP client if it is not already connected.
4. Subscribe to `/topic/rooms/{roomId}`.
5. When the user sends a message, publish to `/app/chat.send/{roomId}`.
6. Append incoming messages from the subscription to the room timeline.

Do not use WebSocket for initial message history until the backend exposes a dedicated history endpoint or history subscription flow.

## Install Client Dependencies

```bash
npm install @stomp/stompjs sockjs-client
```

If you use TypeScript and need types for SockJS:

```bash
npm install -D @types/sockjs-client
```

## Minimal Client Example

```ts
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = "http://localhost:8080";

export function createChatClient(token: string) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 5000
  });

  return client;
}
```

## Room Subscription Example

```ts
import type { IMessage, StompSubscription } from "@stomp/stompjs";

export type ChatMessage = {
  id: number;
  senderId: number;
  roomId: number;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export function subscribeToRoom(
  client: Client,
  roomId: number,
  onMessage: (message: ChatMessage) => void
): StompSubscription {
  return client.subscribe(`/topic/rooms/${roomId}`, (frame: IMessage) => {
    const message = JSON.parse(frame.body) as ChatMessage;
    onMessage(message);
  });
}
```

## Send Message Example

```ts
export function sendRoomMessage(
  client: Client,
  roomId: number,
  content: string
) {
  client.publish({
    destination: `/app/chat.send/${roomId}`,
    body: JSON.stringify({ content })
  });
}
```

## Recommended Service Wrapper

```ts
import { Client, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type ChatMessage = {
  id: number;
  senderId: number;
  roomId: number;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export class ChatSocketService {
  private client: Client | null = null;
  private roomSubscriptions = new Map<number, StompSubscription>();

  connect(token: string) {
    if (this.client?.active) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000
    });

    this.client.activate();
  }

  disconnect() {
    this.roomSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.roomSubscriptions.clear();
    this.client?.deactivate();
    this.client = null;
  }

  subscribe(roomId: number, onMessage: (message: ChatMessage) => void) {
    if (!this.client?.connected) {
      throw new Error("WebSocket client is not connected");
    }

    const existing = this.roomSubscriptions.get(roomId);
    existing?.unsubscribe();

    const subscription = this.client.subscribe(`/topic/rooms/${roomId}`, (frame) => {
      onMessage(JSON.parse(frame.body) as ChatMessage);
    });

    this.roomSubscriptions.set(roomId, subscription);
    return subscription;
  }

  unsubscribe(roomId: number) {
    const subscription = this.roomSubscriptions.get(roomId);
    subscription?.unsubscribe();
    this.roomSubscriptions.delete(roomId);
  }

  send(roomId: number, content: string) {
    if (!this.client?.connected) {
      throw new Error("WebSocket client is not connected");
    }

    this.client.publish({
      destination: `/app/chat.send/${roomId}`,
      body: JSON.stringify({ content })
    });
  }
}
```

## React Integration Pattern

Recommended shape:

1. Create one socket service for the authenticated app session.
2. Connect after login or app bootstrap if a token exists.
3. Subscribe when the room screen opens.
4. Unsubscribe when the room changes or the screen unmounts.
5. Disconnect on logout.

Example:

```tsx
import { useEffect, useRef, useState } from "react";
import { ChatSocketService, type ChatMessage } from "./chatSocketService";

export function RoomChat({ roomId, token }: { roomId: number; token: string }) {
  const serviceRef = useRef<ChatSocketService | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    const service = new ChatSocketService();
    serviceRef.current = service;
    service.connect(token);

    const waitForConnection = window.setInterval(() => {
      try {
        service.subscribe(roomId, (message) => {
          setMessages((current) => [...current, message]);
        });
        window.clearInterval(waitForConnection);
      } catch {
        // Wait until the STOMP client is connected.
      }
    }, 200);

    return () => {
      window.clearInterval(waitForConnection);
      service.unsubscribe(roomId);
      service.disconnect();
    };
  }, [roomId, token]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || !serviceRef.current) {
      return;
    }

    serviceRef.current.send(roomId, trimmed);
    setContent("");
  };

  return null;
}
```

If your app already has a global auth provider or app shell, connect once there instead of reconnecting per room.

## Expected Message Payload

The backend currently broadcasts `MessageDto`.

Example payload:

```json
{
  "id": 10,
  "senderId": 2,
  "roomId": 1,
  "content": "hello",
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-03-23T10:00:00",
  "updatedAt": "2026-03-23T10:00:00"
}
```

## Error Cases To Handle

- Missing token on connect
- Expired token on connect
- User tries to send to a room they are not a member of
- Socket reconnect after backend restart
- Duplicate subscription after room navigation
- User logs out while socket is still connected

Recommended frontend behavior:

- redirect to login if connect fails due to auth
- show a temporary disconnected state in the room UI
- disable send while the client is disconnected
- unsubscribe before subscribing again to the same room

## Recommended Frontend Checklist

1. Build a shared API client for REST requests with bearer token support.
2. Build a shared STOMP client wrapper for room subscriptions.
3. Load room data and members over REST when the room screen opens.
4. Subscribe to the room topic after the socket connects.
5. Send messages through `/app/chat.send/{roomId}`.
6. Append incoming `MessageDto` payloads to local UI state.
7. Disconnect and clear subscriptions on logout.

## Current Limitations

- There is no dedicated REST endpoint documented here for room message history.
- The backend currently broadcasts only new messages.
- Typing indicators, read receipts, and presence are not implemented.
- For horizontal scaling, the current simple broker would later need replacement with a shared broker such as RabbitMQ or a Redis-backed approach.

## Test Plan

1. Log in as user A in browser tab 1.
2. Log in as user B in browser tab 2.
3. Open the same room in both tabs.
4. Send a message from tab 1.
5. Confirm the message appears in tab 2 immediately.
6. Try connecting without a token and confirm the connection is rejected.
7. Try sending to a room where the user is not a member and confirm the UI handles the failure cleanly.
