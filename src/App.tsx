import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutPanelLeft, MessageSquare, MessagesSquare, PanelLeftClose } from 'lucide-react'
import { ChatView } from './components/chat/ChatView'
import { ProfilePage } from './components/layout/ProfilePage'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { SettingsPage } from './components/layout/SettingsPage'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
		const raw = window.localStorage.getItem(SELECTED_CONVERSATION_STORAGE_KEY)
		if (raw === null) {
			return null
		}

		const saved = Number(raw)
		return Number.isNaN(saved) ? null : saved
import { buildSessionFromAuth, getCurrentUser, loginWithPassword, logout, registerWithPassword, saveSession } from './services/authService'
import { ChatSocketService, type ServerMessage } from './services/chatSocketService'
import { createRoom, getRooms } from './services/roomService'
import type { RoomResponse } from './types/api/room'
		() => {
			if (selectedConversationId === null) {
				return undefined
			}

			return activeConversations.find((conversation) => conversation.id === selectedConversationId)
		},
		[activeConversations, selectedConversationId],

const isChatSection = (view: SidebarView): view is ChatSection => view === 'direct' || view === 'groups'
const THEME_STORAGE_KEY = 'kurakaani-theme'
const ACTIVE_VIEW_STORAGE_KEY = 'kurakaani-active-view'
const SELECTED_CONVERSATION_STORAGE_KEY = 'kurakaani-selected-conversation-id'
			setSelectedConversationId((previous) => (
				typeof previous === 'number' && conversationsState[section].some((conversation) => conversation.id === previous)
					? previous
					: null
			))
const MESSAGES_STATE_STORAGE_KEY = 'kurakaani-messages-state'
type ThemeMode = 'light' | 'dark' | 'system'
type MobilePane = 'sidebar' | 'list' | 'detail'
type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

const isSidebarView = (value: string | null): value is SidebarView => {
	return value === 'direct' || value === 'groups' || value === 'settings' || value === 'profile'
}

const loadPersistedConversations = (): Record<ChatSection, Conversation[]> => {
	if (typeof window === 'undefined') {
		return conversationsBySection
		setSelectedConversationId(null)

	try {
		const raw = window.localStorage.getItem(CONVERSATIONS_STATE_STORAGE_KEY)
		if (!raw) {
			return conversationsBySection
		}

		const parsed = JSON.parse(raw) as Record<ChatSection, Conversation[]>
		if (!Array.isArray(parsed?.direct) || !Array.isArray(parsed?.groups)) {
			return conversationsBySection
		}

		return parsed
	} catch {
		return conversationsBySection
	}
}

const loadPersistedMessages = (): Record<number, Message[]> => {
	if (typeof window === 'undefined') {
		return conversationMessages
	}

	try {
		const raw = window.localStorage.getItem(MESSAGES_STATE_STORAGE_KEY)
		if (!raw) {
			return conversationMessages
		}

		return JSON.parse(raw) as Record<number, Message[]>
	} catch {
		return conversationMessages
	}
}

const getAvatarFromName = (name: string, fallback: string): string => {
	const avatar = name
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('')

	return avatar || fallback
}

const toConversationTime = (timestamp?: string): string => {
	if (!timestamp) {
		return 'Now'
	}

	const parsed = new Date(timestamp)
	if (Number.isNaN(parsed.getTime())) {
		return 'Now'
	}

	return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const normalizeMessageContent = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

const normalizeUserName = (value?: string): string => (value ?? '').trim().toLowerCase()

const extractMessageSenderId = (message: RoomResponse['messages'][number]): number | undefined => {
	if (typeof message.senderId === 'number') {
		return message.senderId
	}

	if (typeof message.userId === 'number') {
		return message.userId
	}

	if (message.sender && typeof message.sender.id === 'number') {
		return message.sender.id
	}

	if (message.user && typeof message.user.id === 'number') {
		return message.user.id
	}

	return undefined
}

const extractMessageSenderName = (message: RoomResponse['messages'][number]): string | undefined => {
	if (typeof message.senderName === 'string' && message.senderName.trim().length > 0) {
		return message.senderName
	}

	if (typeof message.userName === 'string' && message.userName.trim().length > 0) {
		return message.userName
	}

	if (typeof message.username === 'string' && message.username.trim().length > 0) {
		return message.username
	}

	if (message.sender) {
		if (typeof message.sender.userName === 'string' && message.sender.userName.trim().length > 0) {
			return message.sender.userName
		}

		if (typeof message.sender.username === 'string' && message.sender.username.trim().length > 0) {
			return message.sender.username
		}

		if (typeof message.sender.name === 'string' && message.sender.name.trim().length > 0) {
			return message.sender.name
		}
	}

	if (message.user) {
		if (typeof message.user.userName === 'string' && message.user.userName.trim().length > 0) {
			return message.user.userName
		}

		if (typeof message.user.username === 'string' && message.user.username.trim().length > 0) {
			return message.user.username
		}

		if (typeof message.user.name === 'string' && message.user.name.trim().length > 0) {
			return message.user.name
		}
	}

	return undefined
}

const isMessageFromCurrentUser = (
	message: RoomResponse['messages'][number],
	currentUserId: number | undefined,
	currentUserName: string | undefined,
): boolean => {
	const senderId = extractMessageSenderId(message)
	if (typeof senderId === 'number' && typeof currentUserId === 'number' && currentUserId > 0) {
		return senderId === currentUserId
	}

	const senderName = normalizeUserName(extractMessageSenderName(message))
	const userName = normalizeUserName(currentUserName)

	return Boolean(senderName && userName && senderName === userName)
}

const mapRoomToConversation = (room: RoomResponse): Conversation => {
	const isGroup = room.type === 'GROUP'
	const memberCount = room.members?.length ?? 0
	const lastMessage = room.messages?.[room.messages.length - 1]
	const preview = lastMessage?.content || room.description || 'No messages yet'

	return {
		id: room.id,
		section: isGroup ? 'groups' : 'direct',
		name: room.name,
		subtitle: isGroup ? `${memberCount} MEMBERS` : 'DIRECT MESSAGE',
		time: toConversationTime(room.updatedAt || room.createdAt),
		preview,
		avatar: getAvatarFromName(room.name, isGroup ? 'GR' : 'DM'),
		isGroup,
		online: isGroup ? undefined : false,
	}
}

const mapRoomToMessages = (room: RoomResponse, currentUserId?: number, currentUserName?: string): Message[] => {
	if (!Array.isArray(room.messages) || room.messages.length === 0) {
		return []
	}

	return room.messages.map((message, index) => {
		const fallbackId = index + 1
		const fromCurrentUser = isMessageFromCurrentUser(message, currentUserId, currentUserName)
		const senderName = extractMessageSenderName(message)

		return {
			id: typeof message.id === 'number' ? message.id : fallbackId,
			side: fromCurrentUser ? 'right' : 'left',
			senderName: fromCurrentUser ? 'You' : senderName || room.name,
			senderAvatar: fromCurrentUser ? 'YO' : getAvatarFromName(senderName || room.name, room.type === 'GROUP' ? 'GR' : 'DM'),
			text: message.content || '',
			timestamp: toConversationTime(message.createdAt),
		}
	})
}

function App() {
	const [activeView, setActiveView] = useState<SidebarView>(() => {
		if (typeof window === 'undefined') {
			return 'direct'
		}

		const saved = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY)
		return isSidebarView(saved) ? saved : 'direct'
	})
	const [session, setSession] = useState<SessionState | null>(() => getSession())
	const [backendStatus, setBackendStatus] = useState('Checking backend connection...')
	const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
		if (typeof window === 'undefined') {
			return 'system'
		}

		const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
		if (saved === 'light' || saved === 'dark' || saved === 'system') {
			return saved
		}

		return 'system'
	})
	const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
		if (typeof window === 'undefined') {
			return false
		}

		return window.matchMedia('(prefers-color-scheme: dark)').matches
	})
	const [conversationsState, setConversationsState] = useState<Record<ChatSection, Conversation[]>>(() => loadPersistedConversations())
	const [messagesByConversation, setMessagesByConversation] = useState<Record<number, Message[]>>(() => loadPersistedMessages())
	const [selectedConversationId, setSelectedConversationId] = useState<number>(() => {
		if (typeof window === 'undefined') {
			return conversationsBySection.direct[0].id
		}

		const saved = Number(window.localStorage.getItem(SELECTED_CONVERSATION_STORAGE_KEY))
		return Number.isNaN(saved) ? conversationsBySection.direct[0].id : saved
	})
	const [newChatTrigger, setNewChatTrigger] = useState(0)
	const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
	const [mobilePane, setMobilePane] = useState<MobilePane>('detail')
	const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false)
	const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
	const [isSocketConnected, setIsSocketConnected] = useState(false)
	const chatSocketRef = useRef<ChatSocketService>(new ChatSocketService())
	const subscribedRoomIdRef = useRef<number | null>(null)
	const pendingSentMessagesRef = useRef<Map<number, Map<string, number>>>(new Map())
	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'
 	const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark'
	const isMobile = viewportWidth < 768
	const isTablet = viewportWidth >= 768 && viewportWidth < 1024
	const isDesktop = viewportWidth >= 1024

	const activeConversations = conversationsState[activeSection]
	const anyConversation = conversationsState.direct[0] ?? conversationsState.groups[0]

	const activeConversation = useMemo(
		() => activeConversations.find((conversation) => conversation.id === selectedConversationId) ?? activeConversations[0] ?? anyConversation,
		[activeConversations, anyConversation, selectedConversationId],
	)

	const activeMessages = activeConversation ? (messagesByConversation[activeConversation.id] ?? []) : []

	const handleSectionChange = (section: SidebarView) => {
		setActiveView(section)
		if (isChatSection(section)) {
			setSelectedConversationId((previous) => conversationsState[section][0]?.id ?? previous)
			if (isMobile) {
				setMobilePane('list')
			}
		} else if (isMobile) {
			setMobilePane('detail')
		}

		setIsSidebarDrawerOpen(false)
	}

	const handleNewChat = (section: ChatSection) => {
		setActiveView(section)
		setSelectedConversationId((previous) => conversationsState[section][0]?.id ?? previous)
		setNewChatTrigger((previous) => previous + 1)
		if (isMobile) {
			setMobilePane('list')
		}
		setIsSidebarDrawerOpen(false)
	}

	const handleSelectConversation = (conversationId: number) => {
		setSelectedConversationId(conversationId)
		if (isMobile) {
			setMobilePane('detail')
		}
	}

	const createGroupConversation = (roomId: number, name: string, description: string) => {
		const avatar = name
			.split(' ')
			.map((part) => part[0]?.toUpperCase())
			.filter(Boolean)
			.slice(0, 2)
			.join('') || 'GR'

		const createdConversation: Conversation = {
			id: roomId,
			section: 'groups',
			name,
			subtitle: 'NEW GROUP',
			time: 'Now',
			preview: description || 'No messages yet',
			avatar,
			isGroup: true,
		}

		setConversationsState((previous) => ({
			...previous,
			groups: [createdConversation, ...previous.groups],
		}))

		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		setMessagesByConversation((previous) => ({
			...previous,
			[roomId]: [
				{
					id: 1,
					side: 'left',
					senderName: 'System',
					senderAvatar: 'SYS',
					text: `Room "${name}" created.`,
					timestamp,
				},
			],
		}))

		setActiveView('groups')
		setSelectedConversationId(roomId)
	}

	const handleCreateGroup = async (name: string, description: string) => {
		if (!session?.accessToken) {
			const roomId = Date.now()
			createGroupConversation(roomId, name, description)
			setBackendStatus('Group created locally. Sign in to create groups on backend.')
			return { ok: true }
		}

		try {
			const room = (await createRoom({
				name,
				description,
				type: 'GROUP',
			})) as { id?: number }

			const roomId = typeof room?.id === 'number' ? room.id : Date.now()
			createGroupConversation(roomId, name, description)
			setBackendStatus(`Group "${name}" created on backend.`)
			return { ok: true }
		} catch {
			return { ok: false, error: 'Backend room creation failed. Please try again.' }
		}
	}

	const createDirectConversation = (roomId: number, name: string, description: string) => {
		const avatar = name
			.split(' ')
			.map((part) => part[0]?.toUpperCase())
			.filter(Boolean)
			.slice(0, 2)
			.join('') || 'DM'

		const createdConversation: Conversation = {
			id: roomId,
			section: 'direct',
			name,
			subtitle: 'DIRECT MESSAGE',
			time: 'Now',
			preview: description || 'No messages yet',
			avatar,
			isGroup: false,
			online: true,
		}

		setConversationsState((previous) => ({
			...previous,
			direct: [createdConversation, ...previous.direct],
		}))

		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		setMessagesByConversation((previous) => ({
			...previous,
			[roomId]: [
				{
					id: 1,
					side: 'left',
					senderName: 'System',
					senderAvatar: 'SYS',
					text: `Direct chat with "${name}" created.`,
					timestamp,
				},
			],
		}))

		setActiveView('direct')
		setSelectedConversationId(roomId)
	}

	const handleCreateDirect = async (name: string, description: string) => {
		if (!session?.accessToken) {
			const roomId = Date.now()
			createDirectConversation(roomId, name, description)
			setBackendStatus('Direct chat created locally. Sign in to create DMs on backend.')
			return { ok: true }
		}

		try {
			const room = (await createRoom({
				name,
				description,
				type: 'DIRECT',
			})) as { id?: number }

			const roomId = typeof room?.id === 'number' ? room.id : Date.now()
			createDirectConversation(roomId, name, description)
			setBackendStatus(`Direct chat "${name}" created on backend.`)
			return { ok: true }
		} catch {
			return { ok: false, error: 'Backend direct chat creation failed. Please try again.' }
		}
	}

	useEffect(() => {
		if (!session?.accessToken) {
			return
		}

		let isCancelled = false

		const syncRooms = async () => {
			try {
				const rooms = await getRooms()
				if (isCancelled || !Array.isArray(rooms)) {
					return
				}

				const nextConversations: Record<ChatSection, Conversation[]> = {
					direct: [],
					groups: [],
				}

				const nextMessages: Record<number, Message[]> = {}

				for (const room of rooms) {
					const conversation = mapRoomToConversation(room)
					nextConversations[conversation.section].push(conversation)
					nextMessages[room.id] = mapRoomToMessages(room, session.user.id, session.user.name)
				}

				if (nextConversations.direct.length > 0 || nextConversations.groups.length > 0) {
					setConversationsState(nextConversations)
					setMessagesByConversation((previous) => ({ ...previous, ...nextMessages }))

					const firstRoomId = nextConversations[activeSection][0]?.id
						?? nextConversations.direct[0]?.id
						?? nextConversations.groups[0]?.id

					if (typeof firstRoomId === 'number') {
						setSelectedConversationId((previous) => {
							const stillExists = nextConversations.direct.some((item) => item.id === previous)
								|| nextConversations.groups.some((item) => item.id === previous)

							return stillExists ? previous : firstRoomId
						})
					}

					setBackendStatus(`Loaded ${rooms.length} rooms from backend.`)
				} else {
					setBackendStatus('No backend rooms found yet. Create a room to start chatting.')
				}
			} catch {
				if (!isCancelled) {
					setBackendStatus('Failed to load rooms from backend.')
				}
			}
		}

		void syncRooms()

		return () => {
			isCancelled = true
		}
	}, [activeSection, session?.accessToken, session?.user.id])

	const handleSendMessage = (conversationId: number, text: string) => {
		const normalized = normalizeMessageContent(text)
		if (normalized) {
			const pendingByRoom = pendingSentMessagesRef.current.get(conversationId) ?? new Map<string, number>()
			pendingByRoom.set(normalized, (pendingByRoom.get(normalized) ?? 0) + 1)
			pendingSentMessagesRef.current.set(conversationId, pendingByRoom)
		}

		if (session?.accessToken) {
			const isSent = chatSocketRef.current.send(conversationId, text)
			if (!isSent) {
				setBackendStatus('Disconnected from live chat. Message was not sent.')
				if (normalized) {
					const pendingByRoom = pendingSentMessagesRef.current.get(conversationId)
					const currentCount = pendingByRoom?.get(normalized) ?? 0
					if (pendingByRoom && currentCount > 0) {
						if (currentCount === 1) {
							pendingByRoom.delete(normalized)
						} else {
							pendingByRoom.set(normalized, currentCount - 1)
						}

						if (pendingByRoom.size === 0) {
							pendingSentMessagesRef.current.delete(conversationId)
						}
					}
				}
				return
			}

			return
		}

		const now = new Date()
		const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

		setMessagesByConversation((prev) => {
			const currentMessages = prev[conversationId] ?? []
			const nextId = (currentMessages[currentMessages.length - 1]?.id ?? 0) + 1

			return {
				...prev,
				[conversationId]: [
					...currentMessages,
					{
						id: nextId,
						side: 'right',
						senderName: 'You',
						senderAvatar: 'YO',
						text,
						timestamp,
					},
				],
			}
		})
	}

	const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
		if (typeof error !== 'object' || error === null) {
			return fallbackMessage
		}

		const maybeError = error as { message?: string }
		return typeof maybeError.message === 'string' && maybeError.message.length > 0 ? maybeError.message : fallbackMessage
	}

	const handleLogin = async (username: string, password: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)

		try {
			const authResponse = await loginWithPassword({ username, password })
			let currentUser: CurrentUserResponse | undefined

			try {
				currentUser = await getCurrentUser()
			} catch {
				currentUser = undefined
			}

			const nextSession = buildSessionFromAuth(authResponse, currentUser)
			saveSession(nextSession)
			setSession(nextSession)
			setBackendStatus(`Signed in as ${nextSession.user.name}. Authenticated requests enabled.`)
			return { ok: true }
		} catch (error) {
			return {
				ok: false,
				error: getErrorMessage(error, 'Login failed. Please check your credentials.'),
			}
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handleRegister = async (username: string, email: string, password: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)

		try {
			await registerWithPassword({ username, email, password })
			setBackendStatus('Registration successful. You can now log in with your credentials.')
			return { ok: true, message: 'Registration successful. Please log in.' }
		} catch (error) {
			return {
				ok: false,
				error: getErrorMessage(error, 'Registration failed. Please try again.'),
			}
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handleLogout = () => {
		logout()
		chatSocketRef.current.disconnect()
		subscribedRoomIdRef.current = null
		setIsSocketConnected(false)
		setSession(null)
		setBackendStatus('Logged out. API requests now run without JWT.')
	}

	useEffect(() => {
		window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
	}, [themeMode])

	useEffect(() => {
		window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView)
	}, [activeView])

	useEffect(() => {
		window.localStorage.setItem(SELECTED_CONVERSATION_STORAGE_KEY, String(selectedConversationId))
	}, [selectedConversationId])

	useEffect(() => {
		window.localStorage.setItem(CONVERSATIONS_STATE_STORAGE_KEY, JSON.stringify(conversationsState))
	}, [conversationsState])

	useEffect(() => {
		window.localStorage.setItem(MESSAGES_STATE_STORAGE_KEY, JSON.stringify(messagesByConversation))
	}, [messagesByConversation])

	useEffect(() => {
		setBackendStatus(session?.accessToken ? 'Authenticated requests enabled.' : 'Sign in to enable protected endpoints.')
	}, [session?.accessToken])

	useEffect(() => {
		if (!session?.accessToken) {
			chatSocketRef.current.disconnect()
			subscribedRoomIdRef.current = null
			setIsSocketConnected(false)
			return
		}

		chatSocketRef.current.connect(session.accessToken, {
			onConnectChange: (connected) => {
				setIsSocketConnected(connected)
				if (!connected) {
					setBackendStatus('Live chat disconnected. Reconnecting…')
				}
			},
			onError: (error) => {
				setBackendStatus(`WebSocket error: ${error}`)
			},
		})

		return () => {
			chatSocketRef.current.disconnect()
			subscribedRoomIdRef.current = null
			setIsSocketConnected(false)
		}
	}, [session?.accessToken])

	useEffect(() => {
		if (!session?.accessToken || activeView === 'settings' || activeView === 'profile' || !activeConversation) {
			const previousRoomId = subscribedRoomIdRef.current
			if (previousRoomId !== null) {
				chatSocketRef.current.unsubscribe(previousRoomId)
				subscribedRoomIdRef.current = null
			}
			return
		}

			const roomId = activeConversation.id

		const appendIncomingMessage = (payload: ServerMessage) => {
			setMessagesByConversation((prev) => {
				const targetRoomId = payload.roomId ?? roomId
				const currentMessages = prev[targetRoomId] ?? []

				const hasDuplicate = currentMessages.some((message) => message.id === payload.id)
				if (hasDuplicate) {
					return prev
				}

				const normalizedContent = normalizeMessageContent(payload.content)
				const pendingByRoom = pendingSentMessagesRef.current.get(targetRoomId)
				const pendingCount = normalizedContent ? (pendingByRoom?.get(normalizedContent) ?? 0) : 0
				const fromCurrentUserByPayload = payload.senderId === session.user.id
				const fromCurrentUser = fromCurrentUserByPayload || pendingCount > 0

				if (pendingByRoom && pendingCount > 0 && normalizedContent) {
					if (pendingCount === 1) {
						pendingByRoom.delete(normalizedContent)
					} else {
						pendingByRoom.set(normalizedContent, pendingCount - 1)
					}

					if (pendingByRoom.size === 0) {
						pendingSentMessagesRef.current.delete(targetRoomId)
					}
				}

				const lastMessage = currentMessages[currentMessages.length - 1]
				const duplicatedFromOptimistic =
					fromCurrentUser && lastMessage?.side === 'right' && normalizeMessageContent(lastMessage.text) === normalizedContent

				if (duplicatedFromOptimistic) {
					return prev
				}

				const timestamp = payload.createdAt
					? new Date(payload.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

				return {
					...prev,
					[targetRoomId]: [
						...currentMessages,
						{
							id: payload.id,
							side: fromCurrentUser ? 'right' : 'left',
							senderName: fromCurrentUser ? 'You' : activeConversation.name,
							senderAvatar: fromCurrentUser ? 'YO' : activeConversation.avatar,
							text: payload.content,
							timestamp,
						},
					],
				}
			})
		}

		const previousRoomId = subscribedRoomIdRef.current
		if (previousRoomId !== null && previousRoomId !== roomId) {
			chatSocketRef.current.unsubscribe(previousRoomId)
		}

		if (previousRoomId === roomId) {
			return
		}

		let isDisposed = false
		const waitForConnection = window.setInterval(() => {
			if (isDisposed || !chatSocketRef.current.isConnected()) {
				return
			}

			try {
				chatSocketRef.current.subscribe(roomId, appendIncomingMessage)
				subscribedRoomIdRef.current = roomId
				setBackendStatus(`Live chat connected to room ${roomId}.`)
				window.clearInterval(waitForConnection)
			} catch {
				// Wait until client is fully connected.
			}
		}, 200)

		return () => {
			isDisposed = true
			window.clearInterval(waitForConnection)
		}
	}, [activeConversation, activeView, session])

	useEffect(() => {
		const handleResize = () => {
			setViewportWidth(window.innerWidth)
		}

		window.addEventListener('resize', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [])

	useEffect(() => {
		if (!isMobile) {
			setMobilePane('detail')
		}

		if (isDesktop) {
			setIsSidebarDrawerOpen(false)
		}

		if (!isDesktop) {
			setIsDesktopSidebarCollapsed(false)
		}
	}, [isDesktop, isMobile])

	useEffect(() => {
		if (!isChatSection(activeView) && isMobile) {
			setMobilePane('detail')
		}
	}, [activeView, isMobile])

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

		const handleChange = (event: MediaQueryListEvent) => {
			setSystemPrefersDark(event.matches)
		}

		setSystemPrefersDark(mediaQuery.matches)
		mediaQuery.addEventListener('change', handleChange)

		return () => {
			mediaQuery.removeEventListener('change', handleChange)
		}
	}, [])

	const renderMainContent = () => {
		if (activeView === 'profile') {
			return <ProfilePage />
		}

		if (activeView === 'settings') {
			return (
				<SettingsPage
					themeMode={themeMode}
					isDarkMode={isDarkMode}
					onThemeModeChange={setThemeMode}
					isAuthenticated={Boolean(session?.accessToken)}
					sessionName={session?.user.name}
					backendStatus={backendStatus}
					isSubmitting={isAuthSubmitting}
					onLogin={handleLogin}
					onRegister={handleRegister}
					onLogout={handleLogout}
				/>
			)
		}

		if (!activeConversation) {
			return (
				<section className="flex min-w-0 flex-1 items-center justify-center bg-[var(--bg-surface-alt)] p-6 text-center">
					<div>
						<h2 className="text-lg font-semibold text-[var(--text-primary)]">No conversations yet</h2>
						<p className="mt-1 text-sm text-[var(--text-secondary)]">Create a new chat to start messaging.</p>
					</div>
				</section>
			)
		}

		if (isMobile) {
			if (mobilePane === 'sidebar') {
				return (
					<Sidebar
						activeView={activeView}
						onSectionChange={handleSectionChange}
						onNewChat={handleNewChat}
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}

			if (mobilePane === 'list') {
				return (
					<RecentMessagesPanel
						section={activeSection}
						conversations={activeConversations}
						selectedConversationId={activeConversation?.id ?? -1}
						onSelectConversation={handleSelectConversation}
						onCreateDirect={handleCreateDirect}
						onCreateGroup={handleCreateGroup}
						newChatTrigger={newChatTrigger}
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}

			return (
				<ChatView
					conversation={activeConversation}
					messages={activeMessages}
					onSendMessage={handleSendMessage}
					isSendDisabled={Boolean(session?.accessToken) && !isSocketConnected}
				/>
			)
		}

		if (isTablet) {
			return (
				<>
					<RecentMessagesPanel
						section={activeSection}
						conversations={activeConversations}
						selectedConversationId={activeConversation.id}
						onSelectConversation={handleSelectConversation}
						onCreateDirect={handleCreateDirect}
						onCreateGroup={handleCreateGroup}
						newChatTrigger={newChatTrigger}
						className="h-full"
					/>
					<ChatView
						conversation={activeConversation}
						messages={activeMessages}
						onSendMessage={handleSendMessage}
						isSendDisabled={Boolean(session?.accessToken) && !isSocketConnected}
					/>
				</>
			)
		}

		return (
			<>
				<RecentMessagesPanel
					section={activeSection}
					conversations={activeConversations}
					selectedConversationId={activeConversation?.id ?? -1}
					onSelectConversation={handleSelectConversation}
					onCreateDirect={handleCreateDirect}
					onCreateGroup={handleCreateGroup}
					newChatTrigger={newChatTrigger}
					className="h-full"
				/>
				<ChatView
					conversation={activeConversation}
					messages={activeMessages}
					onSendMessage={handleSendMessage}
					isSendDisabled={Boolean(session?.accessToken) && !isSocketConnected}
				/>
			</>
		)
	}

	return (
		<div data-theme={isDarkMode ? 'dark' : 'light'} className="h-screen min-h-screen overflow-hidden bg-[var(--bg-page)] p-0 text-[var(--text-primary)] antialiased sm:p-2 lg:p-3">
			<div className="relative flex h-full min-w-0 overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-pane)] sm:rounded-[26px]">
				{isDesktop && !isDesktopSidebarCollapsed && (
					<Sidebar
						activeView={activeView}
						onSectionChange={handleSectionChange}
						onNewChat={handleNewChat}
						className="h-full"
						onToggleCollapse={() => setIsDesktopSidebarCollapsed(true)}
						showCollapseButton
					/>
				)}

				{isDesktop && isDesktopSidebarCollapsed && (
					<button
						type="button"
						onClick={() => setIsDesktopSidebarCollapsed(false)}
						className="motion-interactive absolute left-4 top-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-primary)] shadow-sm"
						aria-label="expand sidebar"
					>
						<LayoutPanelLeft size={16} />
						Menu
					</button>
				)}

				{!isDesktop && isSidebarDrawerOpen && (
					<div className="absolute inset-0 z-40 bg-black/35" onClick={() => setIsSidebarDrawerOpen(false)}>
						<div className="h-full w-fit" onClick={(event) => event.stopPropagation()}>
							<Sidebar
								activeView={activeView}
								onSectionChange={handleSectionChange}
								onNewChat={handleNewChat}
								className="h-full max-w-[84vw] bg-[var(--bg-soft)]"
							/>
						</div>
					</div>
				)}

				<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
					{!isDesktop && (
						<header className="flex min-h-12 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 sm:px-4">
							<button
								type="button"
								onClick={() => setIsSidebarDrawerOpen((previous) => !previous)}
								className="motion-interactive inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 text-sm font-medium text-[var(--text-primary)]"
							>
								{isSidebarDrawerOpen ? <PanelLeftClose size={16} /> : <LayoutPanelLeft size={16} />}
								Menu
							</button>

							{isMobile && isChatSection(activeView) && (
								<div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-1">
									<button
										type="button"
										onClick={() => setMobilePane('list')}
										className={`motion-interactive inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${mobilePane === 'list' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
									>
										<MessagesSquare size={14} />
										Chats
									</button>
									<button
										type="button"
										onClick={() => setMobilePane('detail')}
										className={`motion-interactive inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${mobilePane === 'detail' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
									>
										<MessageSquare size={14} />
										Chat
									</button>
								</div>
							)}

							<div className="w-[52px]" />
						</header>
					)}

					<div className="min-h-0 flex flex-1 min-w-0 overflow-hidden">{renderMainContent()}</div>
				</div>
			</div>
		</div>
	)
}

export default App
