import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_BASE_URL } from '../lib/config'

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

type ConnectOptions = {
	onConnectChange?: (connected: boolean) => void
	onError?: (error: string) => void
}

export class ChatSocketService {
	private client: Client | null = null
	private roomSubscriptions = new Map<number, StompSubscription>()

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
			return
		}

		this.client = new Client({
			webSocketFactory: () => new SockJS(this.resolveWebSocketUrl()),
			connectHeaders: {
				Authorization: `Bearer ${accessToken}`,
			},
			reconnectDelay: 5000,
			onConnect: () => {
				options.onConnectChange?.(true)
			},
			onDisconnect: () => {
				options.onConnectChange?.(false)
			},
			onStompError: (frame) => {
				options.onConnectChange?.(false)
				options.onError?.(frame.headers.message ?? 'WebSocket STOMP error')
			},
			onWebSocketError: () => {
				options.onConnectChange?.(false)
				options.onError?.('WebSocket connection error')
			},
			onWebSocketClose: () => {
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
		existing?.unsubscribe()

		const subscription = this.client.subscribe(`/topic/rooms/${roomId}`, (frame: IMessage) => {
			onMessage(JSON.parse(frame.body) as ServerMessage)
		})

		this.roomSubscriptions.set(roomId, subscription)
		return subscription
	}

	unsubscribe(roomId: number) {
		const subscription = this.roomSubscriptions.get(roomId)
		subscription?.unsubscribe()
		this.roomSubscriptions.delete(roomId)
	}

	send(roomId: number, content: string) {
		if (!this.client?.connected) {
			return false
		}

		this.client.publish({
			destination: `/app/chat.send/${roomId}`,
			body: JSON.stringify({ content }),
		})

		return true
	}

	disconnect() {
		this.roomSubscriptions.forEach((subscription) => subscription.unsubscribe())
		this.roomSubscriptions.clear()
		this.client?.deactivate()
		this.client = null
	}
}
