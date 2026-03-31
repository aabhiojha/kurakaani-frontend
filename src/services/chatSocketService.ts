import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_BASE_URL } from '../lib/config'
import type { FriendshipResponse } from '../types/api/friend'

export type ServerMessage = {
	id: number
	senderId: number
	roomId: number
	content?: string | null
	messageType?: 'TEXT' | 'IMAGE' | 'VIDEO'
	mediaUrl?: string | null
	mediaContentType?: string | null
	mediaFileName?: string | null
	isEdited: boolean
	isDeleted: boolean
	createdAt: string
	updatedAt: string
}

export type TypingEvent = {
	userId?: number
	senderId?: number
	roomId?: number
	userName?: string
	username?: string
	typing?: boolean
	isTyping?: boolean
}

export type NotificationType =
	| 'FRIEND_REQUEST_RECEIVED'
	| 'FRIEND_REQUEST_ACCEPTED'
	| 'FRIEND_REQUEST_REJECTED'
	| 'FRIEND_REMOVED'

export type NotificationEvent = {
	type: NotificationType
	payload: FriendshipResponse
}

type ConnectOptions = {
	onConnectChange?: (connected: boolean) => void
	onError?: (error: string) => void
}

export class ChatSocketService {
	private client: Client | null = null
	private roomSubscriptions = new Map<number, StompSubscription>()
	private typingSubscriptions = new Map<number, StompSubscription>()
	private notificationSubscription: StompSubscription | null = null
	private debug = false

	setDebug(enabled: boolean) {
		this.debug = enabled
	}

	private log(message: string, payload?: unknown) {
		if (!this.debug) {
			return
		}

		if (typeof payload === 'undefined') {
			console.debug(`[ChatSocket] ${message}`)
			return
		}

		console.debug(`[ChatSocket] ${message}`, payload)
	}

	private resolveWebSocketUrl(): string {
		const normalizedBase = API_BASE_URL.replace(/\/$/, '')
		const httpBase = normalizedBase || window.location.origin.replace(/\/$/, '')
		return `${httpBase}/ws`
	}

	connect(accessToken: string, options: ConnectOptions = {}) {
		if (!accessToken) {
			options.onError?.('Missing access token for WebSocket connection')
			return
		}

		if (this.client?.active) {
			this.log('connect skipped because client is already active')
			return
		}

		this.log('activating client', {
			url: this.resolveWebSocketUrl(),
			hasAuthHeader: Boolean(accessToken),
			tokenPreview: accessToken ? `${accessToken.slice(0, 12)}...(${accessToken.length})` : null,
		})

		this.client = new Client({
			webSocketFactory: () => new SockJS(this.resolveWebSocketUrl()),
			connectHeaders: {
				Authorization: `Bearer ${accessToken}`,
			},
			reconnectDelay: 5000,
			onConnect: () => {
				this.log('connected')
				options.onConnectChange?.(true)
			},
			onDisconnect: () => {
				this.log('disconnected')
				options.onConnectChange?.(false)
			},
			onStompError: (frame) => {
				this.log('stomp error', {
					message: frame.headers.message,
					headers: frame.headers,
					body: frame.body,
				})
				options.onConnectChange?.(false)
				options.onError?.(frame.headers.message ?? 'WebSocket STOMP error')
			},
			onWebSocketError: (event) => {
				this.log('websocket error', event)
				options.onConnectChange?.(false)
				options.onError?.('WebSocket connection error')
			},
			onWebSocketClose: (event) => {
				this.log('websocket closed', {
					code: event.code,
					reason: event.reason,
					wasClean: event.wasClean,
				})
				options.onConnectChange?.(false)
			},
		})

		this.client.activate()
	}

	isConnected() {
		return Boolean(this.client?.connected)
	}

	subscribe(roomId: number, onMessage: (message: ServerMessage) => void) {
		if (!this.client?.connected) {
			throw new Error('WebSocket client is not connected')
		}

		const existing = this.roomSubscriptions.get(roomId)
		if (existing) {
			this.log('replacing message subscription', { roomId })
		}
		existing?.unsubscribe()

		const subscription = this.client.subscribe(`/topic/rooms/${roomId}`, (frame: IMessage) => {
			this.log('incoming message frame', { roomId, body: frame.body })
			onMessage(JSON.parse(frame.body) as ServerMessage)
		})

		this.log('subscribed to room messages', { roomId, destination: `/topic/rooms/${roomId}` })

		this.roomSubscriptions.set(roomId, subscription)
		return subscription
	}

	unsubscribe(roomId: number) {
		const subscription = this.roomSubscriptions.get(roomId)
		subscription?.unsubscribe()
		this.roomSubscriptions.delete(roomId)
		this.log('unsubscribed from room messages', { roomId, destination: `/topic/rooms/${roomId}` })
	}

	subscribeToTyping(roomId: number, onTypingEvent: (event: TypingEvent) => void) {
		if (!this.client?.connected) {
			throw new Error('WebSocket client is not connected')
		}

		const existing = this.typingSubscriptions.get(roomId)
		if (existing) {
			this.log('replacing typing subscription', { roomId })
		}
		existing?.unsubscribe()

		const subscription = this.client.subscribe(`/topic/rooms/${roomId}/typing`, (frame: IMessage) => {
			this.log('incoming typing frame', { roomId, body: frame.body })
			onTypingEvent(JSON.parse(frame.body) as TypingEvent)
		})

		this.log('subscribed to typing events', { roomId, destination: `/topic/rooms/${roomId}/typing` })

		this.typingSubscriptions.set(roomId, subscription)
		return subscription
	}

	unsubscribeTyping(roomId: number) {
		const subscription = this.typingSubscriptions.get(roomId)
		subscription?.unsubscribe()
		this.typingSubscriptions.delete(roomId)
		this.log('unsubscribed from typing events', { roomId, destination: `/topic/rooms/${roomId}/typing` })
	}

	subscribeToNotifications(onNotificationEvent: (event: NotificationEvent) => void) {
		if (!this.client?.connected) {
			throw new Error('WebSocket client is not connected')
		}

		if (this.notificationSubscription) {
			this.notificationSubscription.unsubscribe()
			this.notificationSubscription = null
			this.log('replacing notifications subscription')
		}

		this.notificationSubscription = this.client.subscribe('/user/queue/notifications', (frame: IMessage) => {
			this.log('incoming notification frame', { body: frame.body })
			onNotificationEvent(JSON.parse(frame.body) as NotificationEvent)
		})

		this.log('subscribed to notifications', { destination: '/user/queue/notifications' })
		return this.notificationSubscription
	}

	unsubscribeNotifications() {
		this.notificationSubscription?.unsubscribe()
		this.notificationSubscription = null
		this.log('unsubscribed from notifications', { destination: '/user/queue/notifications' })
	}

	send(roomId: number, content: string) {
		if (!this.client?.connected) {
			return false
		}

		this.client.publish({
			destination: `/app/chat.send/${roomId}`,
			body: JSON.stringify({ content }),
		})
		this.log('published room message', { roomId, destination: `/app/chat.send/${roomId}`, content })

		return true
	}

	sendTyping(roomId: number, payload: TypingEvent) {
		if (!this.client?.connected) {
			return false
		}

		this.client.publish({
			destination: `/app/chat.typing/${roomId}`,
			body: JSON.stringify(payload),
		})
		this.log('published typing event', { roomId, destination: `/app/chat.typing/${roomId}`, payload })

		return true
	}

	disconnect() {
		this.log('disconnecting client')
		this.roomSubscriptions.forEach((subscription) => subscription.unsubscribe())
		this.roomSubscriptions.clear()
		this.typingSubscriptions.forEach((subscription) => subscription.unsubscribe())
		this.typingSubscriptions.clear()
		this.notificationSubscription?.unsubscribe()
		this.notificationSubscription = null
		this.client?.deactivate()
		this.client = null
	}
}
