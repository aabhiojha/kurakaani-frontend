import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { ChatSocketService } from '../services/chatSocketService'
import type { NotificationEvent, ServerMessage, TypingEvent } from '../services/chatSocketService'
import {
	getAvatarFromName,
	getKnownSenderName,
	getKnownSenderProfileImageUrl,
	isChatSection,
	normalizeMessageContent,
} from '../lib/chatUtils'
import type { Conversation, Message } from '../types/chat'
import type { CurrentUserResponse, SessionState } from '../types/api/session'
import type { FriendshipResponse } from '../types/api/friend'

type SetMessages = React.Dispatch<React.SetStateAction<Record<number, Message[]>>>

interface UseChatSocketParams {
	session: SessionState | null
	activeConversation: Conversation | undefined
	activeView: string
	currentUserProfile: CurrentUserResponse | undefined
	messagesByConversation: Record<number, Message[]>
	pendingMediaUploadsRef: React.MutableRefObject<Map<number, number>>
	setMessagesByConversation: SetMessages
	onNotification: (type: string, payload: FriendshipResponse, currentUserId: number) => void
	setBackendStatus: (status: string) => void
}

export function useChatSocket({
	session,
	activeConversation,
	activeView,
	currentUserProfile,
	messagesByConversation,
	pendingMediaUploadsRef,
	setMessagesByConversation,
	onNotification,
	setBackendStatus,
}: UseChatSocketParams) {
	const [isSocketConnected, setIsSocketConnected] = useState(false)
	const [typingUsersByConversation, setTypingUsersByConversation] = useState<
		Record<number, Array<{ userId: number; userName: string }>>
	>({})
	const chatSocketRef = useRef<ChatSocketService>(new ChatSocketService())
	const subscribedRoomIdRef = useRef<number | null>(null)
	const subscribedTypingRoomIdRef = useRef<number | null>(null)
	const pendingSentMessagesRef = useRef<Map<number, Map<string, number>>>(new Map())
	const typingExpiryTimersRef = useRef<Map<string, number>>(new Map())

	const isWebSocketDebugEnabled =
		import.meta.env.DEV &&
		(typeof window === 'undefined' || window.localStorage.getItem('kurakaani-ws-debug') !== '0')

	// ── Typing timer helpers ──────────────────────────────────────────────────

	const clearTypingExpiryTimer = (roomId: number, userId: number) => {
		const key = `${roomId}:${userId}`
		const timerId = typingExpiryTimersRef.current.get(key)
		if (typeof timerId === 'number') {
			window.clearTimeout(timerId)
			typingExpiryTimersRef.current.delete(key)
		}
	}

	const clearTypingStateForRoom = (roomId: number) => {
		for (const [key, timerId] of typingExpiryTimersRef.current.entries()) {
			if (key.startsWith(`${roomId}:`)) {
				window.clearTimeout(timerId)
				typingExpiryTimersRef.current.delete(key)
			}
		}
		setTypingUsersByConversation((prev) => {
			if (!(roomId in prev)) return prev
			const next = { ...prev }
			delete next[roomId]
			return next
		})
	}

	// ── Public handlers ───────────────────────────────────────────────────────

	const handleTypingStart = (conversationId: number) => {
		if (!session?.accessToken || !session.user.id) return
		const userName = currentUserProfile?.userName ?? session.user.name ?? 'You'
		chatSocketRef.current.sendTyping(conversationId, {
			userId: session.user.id,
			senderId: session.user.id,
			roomId: conversationId,
			userName,
			username: userName,
			typing: true,
			isTyping: true,
		})
	}

	const handleTypingStop = (conversationId: number) => {
		if (!session?.accessToken || !session.user.id) return
		const userName = currentUserProfile?.userName ?? session.user.name ?? 'You'
		chatSocketRef.current.sendTyping(conversationId, {
			userId: session.user.id,
			senderId: session.user.id,
			roomId: conversationId,
			userName,
			username: userName,
			typing: false,
			isTyping: false,
		})
	}

	const handleSendMessage = (conversationId: number, text: string) => {
		handleTypingStop(conversationId)

		const normalized = normalizeMessageContent(text)
		if (normalized) {
			const byRoom = pendingSentMessagesRef.current.get(conversationId) ?? new Map<string, number>()
			byRoom.set(normalized, (byRoom.get(normalized) ?? 0) + 1)
			pendingSentMessagesRef.current.set(conversationId, byRoom)
		}

		if (session?.accessToken) {
			const sent = chatSocketRef.current.send(conversationId, text)
			if (!sent) {
				setBackendStatus('Disconnected from live chat. Message was not sent.')
				if (normalized) {
					const byRoom = pendingSentMessagesRef.current.get(conversationId)
					const count = byRoom?.get(normalized) ?? 0
					if (byRoom && count > 0) {
						if (count === 1) byRoom.delete(normalized)
						else byRoom.set(normalized, count - 1)
						if (byRoom.size === 0) pendingSentMessagesRef.current.delete(conversationId)
					}
				}
			}
			return
		}

		// Offline optimistic message
		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		setMessagesByConversation((prev) => {
			const current = prev[conversationId] ?? []
			const nextId = (current[current.length - 1]?.id ?? 0) + 1
			return {
				...prev,
				[conversationId]: [
					...current,
					{
						id: nextId,
						isSent: true,
						senderName: 'You',
						senderAvatar: 'YO',
						senderProfileImageUrl:
							currentUserProfile?.profileImageUrl ?? session?.user.profileImageUrl,
						senderId: session?.user.id,
						text,
						timestamp,
					},
				],
			}
		})
	}

	const disconnectAndCleanup = () => {
		chatSocketRef.current.disconnect()
		subscribedRoomIdRef.current = null
		subscribedTypingRoomIdRef.current = null
		typingExpiryTimersRef.current.forEach((id) => window.clearTimeout(id))
		typingExpiryTimersRef.current.clear()
		setTypingUsersByConversation({})
		pendingMediaUploadsRef.current.clear()
		setIsSocketConnected(false)
	}

	// ── Effects ───────────────────────────────────────────────────────────────

	useEffect(() => {
		chatSocketRef.current.setDebug(isWebSocketDebugEnabled)
	}, [isWebSocketDebugEnabled])

	// Connect/disconnect on session change
	useEffect(() => {
		if (!session?.accessToken) {
			disconnectAndCleanup()
			return
		}
		chatSocketRef.current.connect(session.accessToken, {
			onConnectChange: (connected) => {
				setIsSocketConnected(connected)
				if (!connected) setBackendStatus('Live chat disconnected. Reconnecting…')
			},
			onError: (error) => setBackendStatus(`WebSocket error: ${error}`),
		})
		return () => {
			chatSocketRef.current.disconnect()
			subscribedRoomIdRef.current = null
			subscribedTypingRoomIdRef.current = null
			typingExpiryTimersRef.current.forEach((id) => window.clearTimeout(id))
			typingExpiryTimersRef.current.clear()
			setTypingUsersByConversation({})
			setIsSocketConnected(false)
		}
	}, [session?.accessToken])

	// Subscribe to the personal notification channel
	useEffect(() => {
		if (!session?.accessToken || !isSocketConnected) {
			chatSocketRef.current.unsubscribeNotifications()
			return
		}

		const handleNotification = (event: NotificationEvent) => {
			if (isWebSocketDebugEnabled) console.debug('[ChatSocket][Notifications] received', event)
			if (!event.payload) return
			onNotification(event.type, event.payload, session.user.id)
		}

		try {
			if (isWebSocketDebugEnabled) console.debug('[ChatSocket][Notifications] subscribing')
			chatSocketRef.current.subscribeToNotifications(handleNotification)
		} catch {
			// Wait for next reconnect cycle.
		}

		return () => {
			if (isWebSocketDebugEnabled) console.debug('[ChatSocket][Notifications] unsubscribing')
			chatSocketRef.current.unsubscribeNotifications()
		}
	}, [isSocketConnected, session?.accessToken, session?.user.id])

	// Subscribe to active room messages and typing events
	useEffect(() => {
		if (!session?.accessToken || !isChatSection(activeView) || !activeConversation) {
			const prevRoom = subscribedRoomIdRef.current
			if (prevRoom !== null) {
				chatSocketRef.current.unsubscribe(prevRoom)
				clearTypingStateForRoom(prevRoom)
				subscribedRoomIdRef.current = null
			}
			const prevTypingRoom = subscribedTypingRoomIdRef.current
			if (prevTypingRoom !== null) {
				chatSocketRef.current.unsubscribeTyping(prevTypingRoom)
				clearTypingStateForRoom(prevTypingRoom)
				subscribedTypingRoomIdRef.current = null
			}
			return
		}

		const roomId = activeConversation.id

		const appendIncomingMessage = (payload: ServerMessage) => {
			setMessagesByConversation((prev) => {
				const targetRoomId = payload.roomId ?? roomId
				const current = prev[targetRoomId] ?? []
				if (current.some((m) => m.id === payload.id)) return prev

				const normalized = normalizeMessageContent(payload.content)
				const byRoom = pendingSentMessagesRef.current.get(targetRoomId)
				const pendingCount = normalized ? (byRoom?.get(normalized) ?? 0) : 0
				const isMedia = payload.messageType === 'IMAGE' || payload.messageType === 'VIDEO'
				const pendingMedia = isMedia ? (pendingMediaUploadsRef.current.get(targetRoomId) ?? 0) : 0
				const fromCurrentUser =
					payload.senderId === session.user.id || pendingCount > 0 || (isMedia && pendingMedia > 0)

				if (byRoom && pendingCount > 0 && normalized) {
					if (pendingCount === 1) byRoom.delete(normalized)
					else byRoom.set(normalized, pendingCount - 1)
					if (byRoom.size === 0) pendingSentMessagesRef.current.delete(targetRoomId)
				}

				if (isMedia && pendingMedia > 0 && fromCurrentUser) {
					if (pendingMedia === 1) pendingMediaUploadsRef.current.delete(targetRoomId)
					else pendingMediaUploadsRef.current.set(targetRoomId, pendingMedia - 1)
				}

				const last = current[current.length - 1]
				if (
					fromCurrentUser &&
					last?.isSent === true &&
					normalizeMessageContent(last.text) === normalized
				) {
					return prev
				}

				const timestamp = payload.createdAt
					? new Date(payload.createdAt).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})
					: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				const senderName = fromCurrentUser
					? 'You'
					: getKnownSenderName(current, payload.senderId)
				const senderProfileImageUrl = fromCurrentUser
					? (currentUserProfile?.profileImageUrl ?? session.user.profileImageUrl)
					: getKnownSenderProfileImageUrl(current, payload.senderId)

				return {
					...prev,
					[targetRoomId]: [
						...current,
						{
							id: payload.id,
							isSent: fromCurrentUser,
							senderName,
							senderAvatar: fromCurrentUser
								? 'YO'
								: getAvatarFromName(
										senderName,
										`U${String(payload.senderId ?? '').slice(-1) || 'S'}`,
									),
							senderProfileImageUrl,
							senderId: payload.senderId,
							text: payload.content ?? '',
							timestamp,
							messageType: payload.messageType ?? 'TEXT',
							mediaUrl: payload.mediaUrl ?? undefined,
							mediaContentType: payload.mediaContentType ?? undefined,
							mediaFileName: payload.mediaFileName ?? undefined,
						},
					],
				}
			})
		}

		const handleTypingEvent = (event: TypingEvent) => {
			const senderId = event.userId ?? event.senderId
			if (typeof senderId !== 'number' || senderId <= 0 || senderId === session.user.id) return

			const resolvedName = (event.userName ?? event.username ?? '').trim()
			const typingUserName =
				resolvedName.length > 0
					? resolvedName
					: getKnownSenderName(messagesByConversation[roomId] ?? [], senderId)
			const isTyping = event.typing ?? event.isTyping ?? false

			if (isTyping) {
				clearTypingExpiryTimer(roomId, senderId)
				setTypingUsersByConversation((prev) => {
					const current = prev[roomId] ?? []
					const idx = current.findIndex((u) => u.userId === senderId)
					if (idx >= 0) {
						if (current[idx].userName === typingUserName) return prev
						const next = [...current]
						next[idx] = { userId: senderId, userName: typingUserName }
						return { ...prev, [roomId]: next }
					}
					return { ...prev, [roomId]: [...current, { userId: senderId, userName: typingUserName }] }
				})

				const timerId = window.setTimeout(() => {
					typingExpiryTimersRef.current.delete(`${roomId}:${senderId}`)
					setTypingUsersByConversation((prev) => {
						const current = prev[roomId] ?? []
						const next = current.filter((u) => u.userId !== senderId)
						if (next.length === current.length) return prev
						if (next.length === 0) {
							const updated = { ...prev }
							delete updated[roomId]
							return updated
						}
						return { ...prev, [roomId]: next }
					})
				}, 3000)

				typingExpiryTimersRef.current.set(`${roomId}:${senderId}`, timerId)
				return
			}

			clearTypingExpiryTimer(roomId, senderId)
			setTypingUsersByConversation((prev) => {
				const current = prev[roomId] ?? []
				const next = current.filter((u) => u.userId !== senderId)
				if (next.length === current.length) return prev
				if (next.length === 0) {
					const updated = { ...prev }
					delete updated[roomId]
					return updated
				}
				return { ...prev, [roomId]: next }
			})
		}

		const prevRoom = subscribedRoomIdRef.current
		if (prevRoom !== null && prevRoom !== roomId) {
			chatSocketRef.current.unsubscribe(prevRoom)
			clearTypingStateForRoom(prevRoom)
		}

		const prevTypingRoom = subscribedTypingRoomIdRef.current
		if (prevTypingRoom !== null && prevTypingRoom !== roomId) {
			chatSocketRef.current.unsubscribeTyping(prevTypingRoom)
			clearTypingStateForRoom(prevTypingRoom)
		}

		// Already subscribed to this room — only re-subscribe typing if missing.
		if (prevRoom === roomId) {
			if (prevTypingRoom === roomId) return

			let disposed = false
			const interval = window.setInterval(() => {
				if (disposed || !chatSocketRef.current.isConnected()) return
				try {
					chatSocketRef.current.subscribeToTyping(roomId, handleTypingEvent)
					subscribedTypingRoomIdRef.current = roomId
					window.clearInterval(interval)
				} catch {
					// Wait for connection.
				}
			}, 200)
			return () => {
				disposed = true
				window.clearInterval(interval)
			}
		}

		if (prevTypingRoom === roomId) return

		let disposed = false
		const interval = window.setInterval(() => {
			if (disposed || !chatSocketRef.current.isConnected()) return
			try {
				chatSocketRef.current.subscribe(roomId, appendIncomingMessage)
				chatSocketRef.current.subscribeToTyping(roomId, handleTypingEvent)
				subscribedRoomIdRef.current = roomId
				subscribedTypingRoomIdRef.current = roomId
				setBackendStatus(`Live chat connected to room ${roomId}.`)
				window.clearInterval(interval)
			} catch {
				// Wait for connection.
			}
		}, 200)

		return () => {
			disposed = true
			window.clearInterval(interval)
		}
	}, [activeConversation, activeView, session])

	return {
		isSocketConnected,
		typingUsersByConversation,
		handleTypingStart,
		handleTypingStop,
		handleSendMessage,
		disconnectAndCleanup,
		pendingSentMessagesRef,
	}
}
