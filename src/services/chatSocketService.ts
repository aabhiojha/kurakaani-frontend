import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_BASE_URL } from '../lib/config'

type ServerMessage = {
	id?: number
	content: string
	createdAt?: string
}

type ConnectOptions = {
	onConnect?: () => void
	onMessage: (message: ServerMessage) => void
	onError?: (error: string) => void
}

export class ChatSocketService {
	private client: Client | null = null
	private activeRoomId: number | null = null

	connect(roomId: number, options: ConnectOptions) {
		this.disconnect()

		this.client = new Client({
			webSocketFactory: () => new SockJS(`${API_BASE_URL}/chat`),
			reconnectDelay: 5000,
			onStompError: (frame) => {
				options.onError?.(frame.headers.message ?? 'WebSocket STOMP error')
			},
		})

		this.client.onConnect = () => {
			this.activeRoomId = roomId
			options.onConnect?.()
			this.client?.subscribe(`/topic/room/${roomId}`, (frame) => {
				const payload = JSON.parse(frame.body) as ServerMessage
				options.onMessage(payload)
			})
		}

		this.client.activate()
	}

	sendMessage(content: string) {
		if (!this.client?.connected || !this.activeRoomId) {
			return
		}

		this.client.publish({
			destination: `/app/sendMessage/${this.activeRoomId}`,
			body: JSON.stringify({ roomId: this.activeRoomId, content }),
		})
	}

	disconnect() {
		if (this.client) {
			this.client.deactivate()
			this.client = null
		}
		this.activeRoomId = null
	}
}
