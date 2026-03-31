import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutPanelLeft, MessageSquare, MessagesSquare, PanelLeftClose } from 'lucide-react'
import { AuthPage } from './components/auth/AuthPage'
import { ChatView } from './components/chat/ChatView'
import { FindPeoplePage } from './components/layout/FindPeoplePage'
import { FriendRequestsPage } from './components/layout/FriendRequestsPage'
import { ProfilePage } from './components/layout/ProfilePage'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { SettingsPage } from './components/layout/SettingsPage'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
import { buildSessionFromAuth, getCurrentUser, loginWithPassword, logout, registerWithPassword, saveSession, uploadProfileImage } from './services/authService'
import { ChatSocketService, type NotificationEvent, type ServerMessage, type TypingEvent } from './services/chatSocketService'
import { cancelFriendRequest, getFriends, getIncomingFriendRequests, getSentFriendRequests, respondToFriendRequest, sendFriendRequest } from './services/friendService'
import { addUsersToRoom, createGroupRoom, createOrGetDirectRoom, getRoomMembers, getRoomMessages, getRooms, removeUsersFromRoom, updateGroupRoom, upgradeRoomToGroup, uploadRoomMedia } from './services/roomService'
import { GLOBAL_ROOM_ID } from './lib/config'
import { getSession } from './lib/session'
import type { Conversation, ChatSection, Message } from './types/chat'
import type { CurrentUserResponse, SessionState } from './types/api/session'
import type { FriendUserResponse, FriendshipResponse } from './types/api/friend'
import type { RoomMemberResponse, RoomMessageResponse, RoomSummaryResponse } from './types/api/room'

const isChatSection = (view: SidebarView): view is ChatSection => view === 'direct' || view === 'groups'
const THEME_STORAGE_KEY = 'kurakaani-theme'
const ACTIVE_VIEW_STORAGE_KEY = 'kurakaani-active-view'
const SELECTED_CONVERSATION_STORAGE_KEY = 'kurakaani-selected-conversation-id'
const CONVERSATIONS_STATE_STORAGE_KEY = 'kurakaani-conversations-state'
const MESSAGES_STATE_STORAGE_KEY = 'kurakaani-messages-state'

type ThemeMode = 'light' | 'dark' | 'system'
type MobilePane = 'sidebar' | 'list' | 'detail'
type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

const isSidebarView = (value: string | null): value is SidebarView => {
	return value === 'direct' || value === 'groups' || value === 'people' || value === 'friend-requests' || value === 'settings' || value === 'profile'
}

const loadPersistedConversations = (): Record<ChatSection, Conversation[]> => {
	const emptyState: Record<ChatSection, Conversation[]> = {
		direct: [],
		groups: [],
	}

	if (typeof window === 'undefined') {
		return emptyState
	}

	try {
		const raw = window.localStorage.getItem(CONVERSATIONS_STATE_STORAGE_KEY)
		if (!raw) {
			return emptyState
		}

		const parsed = JSON.parse(raw) as Record<ChatSection, Conversation[]>
		if (!Array.isArray(parsed?.direct) || !Array.isArray(parsed?.groups)) {
			return emptyState
		}

		return parsed
	} catch {
		return emptyState
	}
}

const loadPersistedMessages = (): Record<number, Message[]> => {
	if (typeof window === 'undefined') {
		return {}
	}

	try {
		const raw = window.localStorage.getItem(MESSAGES_STATE_STORAGE_KEY)
		if (!raw) {
			return {}
		}

		return JSON.parse(raw) as Record<number, Message[]>
	} catch {
		return {}
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

const normalizeMessageContent = (value?: string | null): string => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const normalizeUserName = (value?: string): string => (value ?? '').trim().toLowerCase()

const isMessageFromCurrentUser = (
	message: RoomMessageResponse,
	currentUserId: number | undefined,
	currentUserName: string | undefined,
): boolean => {
	if (typeof message.userInfo?.id === 'number' && typeof currentUserId === 'number' && currentUserId > 0) {
		return message.userInfo.id === currentUserId
	}

	const senderName = normalizeUserName(message.userInfo?.username)
	const userName = normalizeUserName(currentUserName)

	return Boolean(senderName && userName && senderName === userName)
}

const mapRoomToConversation = (room: RoomSummaryResponse): Conversation => {
	const isGroup = room.type === 'GROUP'
	const preview = room.recentMessage?.messageType === 'IMAGE'
		? 'Shared an image'
		: room.recentMessage?.messageType === 'VIDEO'
			? 'Shared a video'
			: room.recentMessage?.content || room.description || 'No messages yet'
	const time = room.recentMessage ? toConversationTime(room.recentMessage.sentAt) : ''

	return {
		id: room.id,
		section: isGroup ? 'groups' : 'direct',
		name: room.name,
		description: room.description,
		subtitle: isGroup ? `${room.memberCount} MEMBERS` : 'DIRECT MESSAGE',
		time,
		preview,
		avatar: getAvatarFromName(room.name, isGroup ? 'GR' : 'DM'),
		isGroup,
		online: isGroup ? undefined : false,
	}
}

const mapRoomMessagesToMessages = (
	messages: RoomMessageResponse[],
	roomName: string,
	roomType: string,
	currentUserId?: number,
	currentUserName?: string,
): Message[] => {
	return messages.map((message) => {
		const fromCurrentUser = isMessageFromCurrentUser(message, currentUserId, currentUserName)
		const senderName = message.userInfo?.username || roomName

		return {
			id: message.id,
			isSent: fromCurrentUser,
			senderName: fromCurrentUser ? 'You' : senderName,
			senderAvatar: fromCurrentUser ? 'YO' : getAvatarFromName(senderName, roomType === 'GROUP' ? 'GR' : 'DM'),
			senderProfileImageUrl: message.userInfo?.profileImageUrl ?? undefined,
			senderId: message.userInfo?.id,
			text: message.content ?? '',
			timestamp: toConversationTime(message.createdAt),
			messageType: message.messageType,
			mediaUrl: message.mediaUrl ?? undefined,
			mediaContentType: message.mediaContentType ?? undefined,
			mediaFileName: message.mediaFileName ?? undefined,
		}
	})
}

const getKnownSenderName = (messages: Message[], senderId?: number, fallback?: string): string => {
	if (typeof senderId !== 'number' || senderId <= 0) {
		return fallback ?? 'Unknown user'
	}

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index]
		if (message.senderId === senderId && message.senderName && message.senderName !== 'You') {
			return message.senderName
		}
	}

	return fallback ?? `User #${senderId}`
}

const getKnownSenderProfileImageUrl = (messages: Message[], senderId?: number): string | undefined => {
	if (typeof senderId !== 'number' || senderId <= 0) {
		return undefined
	}

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index]
		if (message.senderId === senderId && message.senderProfileImageUrl) {
			return message.senderProfileImageUrl
		}
	}

	return undefined
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
	const [selectedConversationId, setSelectedConversationId] = useState<number | null>(() => {
		if (typeof window === 'undefined') {
			return null
		}

		const saved = window.localStorage.getItem(SELECTED_CONVERSATION_STORAGE_KEY)
		if (!saved) {
			return null
		}

		const parsed = Number(saved)
		return Number.isNaN(parsed) ? null : parsed
	})
	const [newChatTrigger, setNewChatTrigger] = useState(0)
	const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
	const [mobilePane, setMobilePane] = useState<MobilePane>('detail')
	const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false)
	const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
	const [isSocketConnected, setIsSocketConnected] = useState(false)
	const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserResponse | undefined>(undefined)
	const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendshipResponse[]>([])
	const [sentFriendRequests, setSentFriendRequests] = useState<FriendshipResponse[]>([])
	const [friends, setFriends] = useState<FriendUserResponse[]>([])
	const [isFriendshipsLoading, setIsFriendshipsLoading] = useState(false)
	const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null)
	const [roomMembersByConversation, setRoomMembersByConversation] = useState<Record<number, RoomMemberResponse[]>>({})
	const [roomMembersStatus, setRoomMembersStatus] = useState<string | null>(null)
	const [isRoomMembersLoading, setIsRoomMembersLoading] = useState(false)
	const [typingUsersByConversation, setTypingUsersByConversation] = useState<Record<number, Array<{ userId: number; userName: string }>>>({})
	const isWebSocketDebugEnabled = import.meta.env.DEV
		&& (typeof window === 'undefined' || window.localStorage.getItem('kurakaani-ws-debug') !== '0')
	const chatSocketRef = useRef<ChatSocketService>(new ChatSocketService())
	const subscribedRoomIdRef = useRef<number | null>(null)
	const subscribedTypingRoomIdRef = useRef<number | null>(null)
	const pendingSentMessagesRef = useRef<Map<number, Map<string, number>>>(new Map())
	const pendingMediaUploadsRef = useRef<Map<number, number>>(new Map())
	const typingExpiryTimersRef = useRef<Map<string, number>>(new Map())
	const attemptedGlobalJoinUserIdsRef = useRef<Set<number>>(new Set())
	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'
 	const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark'
	const isMobile = viewportWidth < 768
	const isTablet = viewportWidth >= 768 && viewportWidth < 1024
	const isDesktop = viewportWidth >= 1024

	const activeConversations = conversationsState[activeSection]
	const sidebarUserName = currentUserProfile?.userName ?? session?.user.name
	const sidebarUserProfileImageUrl = currentUserProfile?.profileImageUrl ?? session?.user.profileImageUrl

	const activeConversation = useMemo(
		() => {
			if (selectedConversationId === null) {
				return undefined
			}

			return (
				conversationsState[activeSection].find((conversation) => conversation.id === selectedConversationId)
				?? conversationsState.direct.find((conversation) => conversation.id === selectedConversationId)
				?? conversationsState.groups.find((conversation) => conversation.id === selectedConversationId)
			)
		},
		[activeSection, conversationsState, selectedConversationId],
	)

	const activeMessages = activeConversation ? (messagesByConversation[activeConversation.id] ?? []) : []
	const activeRoomMembers = activeConversation ? (roomMembersByConversation[activeConversation.id] ?? []) : []
	const activeTypingUsers = activeConversation ? (typingUsersByConversation[activeConversation.id] ?? []) : []
	const activeTypingText = useMemo(() => {
		if (activeTypingUsers.length === 0) {
			return null
		}

		const names = activeTypingUsers.map((item) => item.userName)
		if (names.length === 1) {
			return `${names[0]} is typing...`
		}

		return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are typing...`
	}, [activeTypingUsers])

	const handleSectionChange = (section: SidebarView) => {
		setActiveView(section)
		if (isChatSection(section)) {
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

	const clearTypingExpiryTimer = (roomId: number, userId: number) => {
		const timerKey = `${roomId}:${userId}`
		const timerId = typingExpiryTimersRef.current.get(timerKey)
		if (typeof timerId === 'number') {
			window.clearTimeout(timerId)
			typingExpiryTimersRef.current.delete(timerKey)
		}
	}

	const clearTypingStateForRoom = (roomId: number) => {
		for (const [key, timerId] of typingExpiryTimersRef.current.entries()) {
			if (key.startsWith(`${roomId}:`)) {
				window.clearTimeout(timerId)
				typingExpiryTimersRef.current.delete(key)
			}
		}

		setTypingUsersByConversation((previous) => {
			if (!(roomId in previous)) {
				return previous
			}

			const next = { ...previous }
			delete next[roomId]
			return next
		})
	}

	const resolveTypingUserName = () => currentUserProfile?.userName ?? session?.user.name ?? 'You'

	const handleTypingStart = (conversationId: number) => {
		if (!session?.accessToken || !session.user.id) {
			return
		}

		const userName = resolveTypingUserName()

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
		if (!session?.accessToken || !session.user.id) {
			return
		}

		const userName = resolveTypingUserName()

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
			description,
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
					isSent: false,
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
			const room = (await createGroupRoom({
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
			description,
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
					isSent: false,
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

		const userId = Number(name.trim())
		if (!Number.isInteger(userId) || userId <= 0) {
			return { ok: false, error: 'Enter a valid user ID to create a direct chat.' }
		}

		try {
			const room = (await createOrGetDirectRoom(userId)) as { id?: number }

			const roomId = typeof room?.id === 'number' ? room.id : Date.now()
			createDirectConversation(roomId, `User #${userId}`, description)
			setBackendStatus(`Direct chat with user ${userId} created on backend.`)
			return { ok: true }
		} catch {
			return { ok: false, error: 'Backend direct chat creation failed. Use a valid target user ID.' }
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

				for (const room of rooms) {
					const conversation = mapRoomToConversation(room)
					nextConversations[conversation.section].push(conversation)
				}

				const messageResults = await Promise.allSettled(
					rooms.map((room) => getRoomMessages(room.id)),
				)

				const nextMessages: Record<number, Message[]> = {}

				for (let i = 0; i < rooms.length; i++) {
					const room = rooms[i]
					const result = messageResults[i]
					if (result.status === 'fulfilled' && Array.isArray(result.value)) {
						nextMessages[room.id] = mapRoomMessagesToMessages(result.value, room.name, room.type, session.user.id, session.user.name)
					} else {
						nextMessages[room.id] = []
					}
				}

				if (nextConversations.direct.length > 0 || nextConversations.groups.length > 0) {
					setConversationsState(nextConversations)
					setMessagesByConversation((previous) => ({ ...previous, ...nextMessages }))

					setSelectedConversationId((previous) => {
						if (previous === null) {
							return null
						}

						const stillExists = nextConversations.direct.some((item) => item.id === previous)
							|| nextConversations.groups.some((item) => item.id === previous)

						return stillExists ? previous : null
					})

					setBackendStatus(`Loaded ${rooms.length} rooms from backend.`)
				} else {
					setConversationsState({ direct: [], groups: [] })
					setMessagesByConversation({})
					setSelectedConversationId(null)
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
		handleTypingStop(conversationId)

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
						isSent: true,
						senderName: 'You',
						senderAvatar: 'YO',
						senderProfileImageUrl: currentUserProfile?.profileImageUrl ?? session?.user.profileImageUrl,
						senderId: session?.user.id,
						text,
						timestamp,
					},
				],
			}
		})
	}

	const handleUploadMedia = async (conversationId: number, file: File, caption?: string) => {
		if (!session?.accessToken) {
			setBackendStatus('Sign in to upload images or videos.')
			return
		}

		pendingMediaUploadsRef.current.set(conversationId, (pendingMediaUploadsRef.current.get(conversationId) ?? 0) + 1)

		try {
			const uploadedMessage = await uploadRoomMedia(conversationId, file, caption)
			const pendingMediaCount = pendingMediaUploadsRef.current.get(conversationId) ?? 0
			if (pendingMediaCount <= 1) {
				pendingMediaUploadsRef.current.delete(conversationId)
			} else {
				pendingMediaUploadsRef.current.set(conversationId, pendingMediaCount - 1)
			}

			setMessagesByConversation((previous) => {
				const currentMessages = previous[conversationId] ?? []
				const hasDuplicate = currentMessages.some((message) => message.id === uploadedMessage.id)
				if (hasDuplicate) {
					return previous
				}

				const timestamp = uploadedMessage.createdAt
					? new Date(uploadedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

				return {
					...previous,
					[conversationId]: [
						...currentMessages,
						{
							id: uploadedMessage.id,
							isSent: true,
							senderName: 'You',
							senderAvatar: 'YO',
							senderProfileImageUrl: currentUserProfile?.profileImageUrl ?? session.user.profileImageUrl,
							senderId: session.user.id,
							text: uploadedMessage.content ?? '',
							timestamp,
							messageType: uploadedMessage.messageType,
							mediaUrl: uploadedMessage.mediaUrl ?? undefined,
							mediaContentType: uploadedMessage.mediaContentType ?? undefined,
							mediaFileName: uploadedMessage.mediaFileName ?? undefined,
						},
					],
				}
			})

			setBackendStatus(`Uploaded ${file.type.startsWith('video/') ? 'video' : 'image'} to room ${conversationId}.`)
		} catch (error) {
			const pendingMediaCount = pendingMediaUploadsRef.current.get(conversationId) ?? 0
			if (pendingMediaCount <= 1) {
				pendingMediaUploadsRef.current.delete(conversationId)
			} else {
				pendingMediaUploadsRef.current.set(conversationId, pendingMediaCount - 1)
			}
			setBackendStatus(getErrorMessage(error, 'Media upload failed. Please try again.'))
		}
	}

	const loadRoomMembers = async (roomId: number) => {
		setIsRoomMembersLoading(true)

		try {
			const members = await getRoomMembers(roomId)
			setRoomMembersByConversation((previous) => ({
				...previous,
				[roomId]: members,
			}))
			setRoomMembersStatus(`Loaded ${members.length} member${members.length === 1 ? '' : 's'} for room ${roomId}.`)
			return members
		} catch {
			setRoomMembersStatus('Failed to load room members.')
			return [] as RoomMemberResponse[]
		} finally {
			setIsRoomMembersLoading(false)
		}
	}

	const updateConversationSummary = (roomId: number, updates: { name?: string; description?: string; memberCount?: number }) => {
		setConversationsState((previous) => {
			const applyUpdate = (conversation: Conversation): Conversation => {
				if (conversation.id !== roomId) {
					return conversation
				}

				const nextName = updates.name ?? conversation.name
				const nextDescription = updates.description ?? conversation.description
				const nextSubtitle = conversation.isGroup && typeof updates.memberCount === 'number'
					? `${updates.memberCount} MEMBERS`
					: conversation.subtitle

				return {
					...conversation,
					name: nextName,
					description: nextDescription,
					subtitle: nextSubtitle,
					preview: nextDescription || conversation.preview,
					avatar: getAvatarFromName(nextName, conversation.isGroup ? 'GR' : 'DM'),
				}
			}

			return {
				...previous,
				direct: previous.direct.map(applyUpdate),
				groups: previous.groups.map(applyUpdate),
			}
		})
	}

	const handleAddUsersToRoom = async (conversationId: number, userIds: number[]) => {
		const conversation = conversationsState.direct.find((item) => item.id === conversationId)
			?? conversationsState.groups.find((item) => item.id === conversationId)

		if (conversation && !conversation.isGroup) {
			await upgradeRoomToGroup(conversationId, userIds)
			setConversationsState((previous) => {
				const existingDirect = previous.direct.find((item) => item.id === conversationId)
				if (!existingDirect) {
					return previous
				}

				const upgradedConversation: Conversation = {
					...existingDirect,
					section: 'groups',
					isGroup: true,
					subtitle: 'GROUP',
				}

				return {
					...previous,
					direct: previous.direct.filter((item) => item.id !== conversationId),
					groups: [upgradedConversation, ...previous.groups.filter((item) => item.id !== conversationId)],
				}
			})
			setActiveView('groups')
		}

		await addUsersToRoom(conversationId, userIds)
		const members = await loadRoomMembers(conversationId)
		updateConversationSummary(conversationId, { memberCount: members.length })
		setBackendStatus(`Added ${userIds.length} user${userIds.length === 1 ? '' : 's'} to room ${conversationId}.`)
	}

	const handleUpdateRoomDetails = async (conversationId: number, updates: { name?: string; description?: string }) => {
		const payload = {
			...(updates.name ? { name: updates.name } : {}),
			...(typeof updates.description === 'string' ? { description: updates.description } : {}),
		}

		const updatedRoom = await updateGroupRoom(conversationId, payload)
		updateConversationSummary(conversationId, {
			name: updatedRoom.name,
			description: updatedRoom.description,
			memberCount: updatedRoom.members.length,
		})
		setRoomMembersByConversation((previous) => ({
			...previous,
			[conversationId]: updatedRoom.members,
		}))
		setBackendStatus(`Updated room ${conversationId} settings.`)
	}

	const handleRemoveMembersFromRoom = async (conversationId: number, memberIds: number[]) => {
		await removeUsersFromRoom(conversationId, memberIds)
		const members = await loadRoomMembers(conversationId)
		updateConversationSummary(conversationId, { memberCount: members.length })
		setBackendStatus(`Removed ${memberIds.length} member${memberIds.length === 1 ? '' : 's'} from room ${conversationId}.`)
	}

	const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
		if (typeof error !== 'object' || error === null) {
			return fallbackMessage
		}

		const maybeError = error as { message?: string }
		return typeof maybeError.message === 'string' && maybeError.message.length > 0 ? maybeError.message : fallbackMessage
	}

	const loadFriendships = async () => {
		if (!session?.accessToken) {
			setIncomingFriendRequests([])
			setSentFriendRequests([])
			setFriends([])
			return
		}

		setIsFriendshipsLoading(true)

		try {
			const [incoming, sent, accepted] = await Promise.all([
				getIncomingFriendRequests(),
				getSentFriendRequests(),
				getFriends(),
			])

			setIncomingFriendRequests(incoming)
			setSentFriendRequests(sent)
			setFriends(accepted)
		} catch {
			setFriendshipStatus('Failed to load friendship data.')
		} finally {
			setIsFriendshipsLoading(false)
		}
	}

	const handleSendFriendRequest = async (userId: number) => {
		await sendFriendRequest(userId)
		await loadFriendships()
		setFriendshipStatus(`Friend request sent to user ${userId}.`)
	}

	const handleRespondToFriendRequest = async (userId: number, response: 'ACCEPT' | 'REJECT') => {
		await respondToFriendRequest(userId, response)
		await loadFriendships()
		setFriendshipStatus(`Friend request from user ${userId} ${response === 'ACCEPT' ? 'accepted' : 'rejected'}.`)
	}

	const handleCancelFriendRequest = async (userId: number) => {
		await cancelFriendRequest(userId)
		await loadFriendships()
		setFriendshipStatus(`Cancelled friend request to user ${userId}.`)
	}

	const handleUploadProfileImage = async (file: File) => {
		if (!session?.accessToken) {
			throw new Error('Sign in to upload a profile image.')
		}

		await uploadProfileImage(file)
		const refreshedUser = await getCurrentUser()

		setCurrentUserProfile(refreshedUser)
		setSession((previous) => {
			if (!previous) {
				return previous
			}

			const nextSession: SessionState = {
				...previous,
				user: {
					...previous.user,
					id: refreshedUser.id,
					email: refreshedUser.email,
					name: refreshedUser.userName,
					roles: refreshedUser.roles,
					profileImageUrl: refreshedUser.profileImageUrl,
				},
			}

			saveSession(nextSession)
			return nextSession
		})

		setBackendStatus('Profile image updated successfully.')
	}

	const ensureGlobalRoomMembership = async (sessionState: SessionState, currentUser?: CurrentUserResponse) => {
		const userId = currentUser?.id ?? sessionState.user.id
		if (!userId || attemptedGlobalJoinUserIdsRef.current.has(userId)) {
			return false
		}

		attemptedGlobalJoinUserIdsRef.current.add(userId)

		try {
			const rooms = await getRooms()
			if (rooms.some((room) => room.id === GLOBAL_ROOM_ID)) {
				return false
			}
		} catch {
			// Fall back to add attempt when room list cannot be resolved.
		}

		try {
			await addUsersToRoom(GLOBAL_ROOM_ID, [userId])
			return true
		} catch {
			return false
		}
	}

	const completeAuthenticatedSession = async (authResponse: { token: string; username: string; roles: string[] }) => {
		let currentUser: CurrentUserResponse | undefined

		try {
			currentUser = await getCurrentUser()
		} catch {
			currentUser = undefined
		}

		const nextSession = buildSessionFromAuth(authResponse, currentUser)
		saveSession(nextSession)
		setSession(nextSession)
		setCurrentUserProfile(currentUser)

		const joinedGlobalRoom = await ensureGlobalRoomMembership(nextSession, currentUser)

		setActiveView('groups')
		setSelectedConversationId(null)
		if (isMobile) {
			setMobilePane('list')
		}

		setBackendStatus(
			joinedGlobalRoom
				? `Signed in as ${nextSession.user.name}. Joined global room ${GLOBAL_ROOM_ID}.`
				: `Signed in as ${nextSession.user.name}. Authenticated requests enabled.`,
		)
	}

	const handleLogin = async (username: string, password: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)

		try {
			const authResponse = await loginWithPassword({ username, password })
			await completeAuthenticatedSession(authResponse)
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
			const authResponse = await loginWithPassword({ username, password })
			await completeAuthenticatedSession(authResponse)
			return { ok: true, message: 'Registration successful. You have been added to the global chat.' }
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
		subscribedTypingRoomIdRef.current = null
		typingExpiryTimersRef.current.forEach((timerId) => {
			window.clearTimeout(timerId)
		})
		typingExpiryTimersRef.current.clear()
		setTypingUsersByConversation({})
		pendingMediaUploadsRef.current.clear()
		attemptedGlobalJoinUserIdsRef.current.clear()
		setIsSocketConnected(false)
		setCurrentUserProfile(undefined)
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
		if (selectedConversationId === null) {
			window.localStorage.removeItem(SELECTED_CONVERSATION_STORAGE_KEY)
			return
		}

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
			setCurrentUserProfile(undefined)
			setIncomingFriendRequests([])
			setSentFriendRequests([])
			setFriends([])
			return
		}

		let isCancelled = false

		const syncCurrentUser = async () => {
			try {
				const user = await getCurrentUser()
				if (!isCancelled) {
					setCurrentUserProfile(user)
				}
			} catch {
				if (!isCancelled) {
					setCurrentUserProfile(undefined)
				}
			}
		}

		void syncCurrentUser()

		return () => {
			isCancelled = true
		}
	}, [session?.accessToken])

	useEffect(() => {
		if (!session?.accessToken) {
			setFriendshipStatus(null)
			return
		}

		void loadFriendships()
	}, [session?.accessToken])

	useEffect(() => {
		if (!session?.accessToken || !isSocketConnected) {
			if (isWebSocketDebugEnabled) {
				console.debug('[ChatSocket][Notifications] skipping subscribe', {
					hasAccessToken: Boolean(session?.accessToken),
					isSocketConnected,
				})
			}
			chatSocketRef.current.unsubscribeNotifications()
			return
		}

		const upsertFriendship = (items: FriendshipResponse[], payload: FriendshipResponse) => {
			const existingIndex = items.findIndex((item) => item.id === payload.id)
			if (existingIndex >= 0) {
				const next = [...items]
				next[existingIndex] = payload
				return next
			}

			return [payload, ...items]
		}

		const removeByParticipants = (items: FriendshipResponse[], payload: FriendshipResponse) =>
			items.filter((item) => {
				const sameId = item.id === payload.id
				const sameParticipants = item.requesterId === payload.requesterId && item.recipientId === payload.recipientId
				return !sameId && !sameParticipants
			})

		const handleNotification = (event: NotificationEvent) => {
			if (isWebSocketDebugEnabled) {
				console.debug('[ChatSocket][Notifications] received event', event)
			}

			const payload = event.payload
			if (!payload) {
				return
			}

			switch (event.type) {
				case 'FRIEND_REQUEST_RECEIVED': {
					setIncomingFriendRequests((previous) => upsertFriendship(previous, payload))
					setFriendshipStatus(`New friend request from user ${payload.requesterId}.`)
					break
				}
				case 'FRIEND_REQUEST_ACCEPTED': {
					setIncomingFriendRequests((previous) => removeByParticipants(previous, payload))
					setSentFriendRequests((previous) => removeByParticipants(previous, payload))
					setFriends((previous) => upsertFriendship(previous, { ...payload, status: 'ACCEPTED' }))
					const acceptedByUserId = payload.recipientId === session.user.id ? payload.requesterId : payload.recipientId
					setFriendshipStatus(`Friend request accepted by user ${acceptedByUserId}.`)
					break
				}
				case 'FRIEND_REQUEST_REJECTED': {
					setIncomingFriendRequests((previous) => removeByParticipants(previous, payload))
					setSentFriendRequests((previous) => removeByParticipants(previous, payload))
					setFriendshipStatus('A friend request was rejected.')
					break
				}
				case 'FRIEND_REMOVED': {
					setFriends((previous) => removeByParticipants(previous, payload))
					setFriendshipStatus('A friend removed you.')
					break
				}
				default:
					break
			}
		}

		try {
			if (isWebSocketDebugEnabled) {
				console.debug('[ChatSocket][Notifications] subscribing to /user/queue/notifications')
			}
			chatSocketRef.current.subscribeToNotifications(handleNotification)
		} catch {
			if (isWebSocketDebugEnabled) {
				console.debug('[ChatSocket][Notifications] subscribe failed, waiting for reconnect')
			}
			// Wait for next reconnect cycle.
		}

		return () => {
			if (isWebSocketDebugEnabled) {
				console.debug('[ChatSocket][Notifications] unsubscribing from /user/queue/notifications')
			}
			chatSocketRef.current.unsubscribeNotifications()
		}
	}, [isSocketConnected, isWebSocketDebugEnabled, session?.accessToken, session?.user.id])

	useEffect(() => {
		if (!session?.accessToken) {
			return
		}

		void ensureGlobalRoomMembership(session, currentUserProfile)
	}, [currentUserProfile, session])

	useEffect(() => {
		if (!session?.accessToken || !activeConversation) {
			setRoomMembersStatus(null)
			setIsRoomMembersLoading(false)
			return
		}

		void loadRoomMembers(activeConversation.id)
		}, [activeConversation?.id, session?.accessToken])

	useEffect(() => {
		chatSocketRef.current.setDebug(isWebSocketDebugEnabled)
	}, [isWebSocketDebugEnabled])

	useEffect(() => {
		if (!session?.accessToken) {
			chatSocketRef.current.disconnect()
			subscribedRoomIdRef.current = null
			subscribedTypingRoomIdRef.current = null
			typingExpiryTimersRef.current.forEach((timerId) => {
				window.clearTimeout(timerId)
			})
			typingExpiryTimersRef.current.clear()
			setTypingUsersByConversation({})
			pendingMediaUploadsRef.current.clear()
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
			subscribedTypingRoomIdRef.current = null
			typingExpiryTimersRef.current.forEach((timerId) => {
				window.clearTimeout(timerId)
			})
			typingExpiryTimersRef.current.clear()
			setTypingUsersByConversation({})
			setIsSocketConnected(false)
		}
	}, [session?.accessToken])

	useEffect(() => {
		if (!session?.accessToken || !isChatSection(activeView) || !activeConversation) {
			const previousRoomId = subscribedRoomIdRef.current
			if (previousRoomId !== null) {
				chatSocketRef.current.unsubscribe(previousRoomId)
				clearTypingStateForRoom(previousRoomId)
				subscribedRoomIdRef.current = null
			}

			const previousTypingRoomId = subscribedTypingRoomIdRef.current
			if (previousTypingRoomId !== null) {
				chatSocketRef.current.unsubscribeTyping(previousTypingRoomId)
				clearTypingStateForRoom(previousTypingRoomId)
				subscribedTypingRoomIdRef.current = null
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
				const isMediaMessage = payload.messageType === 'IMAGE' || payload.messageType === 'VIDEO'
				const pendingMediaCount = isMediaMessage ? (pendingMediaUploadsRef.current.get(targetRoomId) ?? 0) : 0
				const fromCurrentUserByPayload = payload.senderId === session.user.id
				const fromCurrentUserByPendingMedia = isMediaMessage && pendingMediaCount > 0
				const fromCurrentUser = fromCurrentUserByPayload || pendingCount > 0 || fromCurrentUserByPendingMedia

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

				if (isMediaMessage && pendingMediaCount > 0 && fromCurrentUser) {
					if (pendingMediaCount === 1) {
						pendingMediaUploadsRef.current.delete(targetRoomId)
					} else {
						pendingMediaUploadsRef.current.set(targetRoomId, pendingMediaCount - 1)
					}
				}

				const lastMessage = currentMessages[currentMessages.length - 1]
				const duplicatedFromOptimistic =
					fromCurrentUser && lastMessage?.isSent === true && normalizeMessageContent(lastMessage.text) === normalizedContent

				if (duplicatedFromOptimistic) {
					return prev
				}

				const timestamp = payload.createdAt
					? new Date(payload.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				const senderName = fromCurrentUser
					? 'You'
					: getKnownSenderName(currentMessages, payload.senderId)
				const senderProfileImageUrl = fromCurrentUser
					? (currentUserProfile?.profileImageUrl ?? session.user.profileImageUrl)
					: getKnownSenderProfileImageUrl(currentMessages, payload.senderId)
				const senderAvatar = fromCurrentUser
					? 'YO'
					: getAvatarFromName(senderName, `U${String(payload.senderId ?? '').slice(-1) || 'S'}`)

				return {
					...prev,
					[targetRoomId]: [
						...currentMessages,
						{
							id: payload.id,
							isSent: fromCurrentUser,
							senderName,
							senderAvatar,
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

		const previousRoomId = subscribedRoomIdRef.current
		if (previousRoomId !== null && previousRoomId !== roomId) {
			chatSocketRef.current.unsubscribe(previousRoomId)
			clearTypingStateForRoom(previousRoomId)
		}

		const handleTypingEvent = (event: TypingEvent) => {
			const senderId = event.userId ?? event.senderId
			if (typeof senderId !== 'number' || senderId <= 0) {
				return
			}

			if (senderId === session.user.id) {
				return
			}

			const resolvedTypingUserName = (event.userName ?? event.username ?? '').trim()
			const typingUserName = resolvedTypingUserName.length > 0
				? resolvedTypingUserName
				: getKnownSenderName(messagesByConversation[roomId] ?? [], senderId)
			const isTyping = event.typing ?? event.isTyping ?? false

			if (isTyping) {
				clearTypingExpiryTimer(roomId, senderId)
				setTypingUsersByConversation((previous) => {
					const currentTypingUsers = previous[roomId] ?? []
					const existingIndex = currentTypingUsers.findIndex((item) => item.userId === senderId)

					if (existingIndex >= 0) {
						const existing = currentTypingUsers[existingIndex]
						if (existing.userName === typingUserName) {
							return previous
						}

						const nextTypingUsers = [...currentTypingUsers]
						nextTypingUsers[existingIndex] = { userId: senderId, userName: typingUserName }
						return { ...previous, [roomId]: nextTypingUsers }
					}

					return {
						...previous,
						[roomId]: [...currentTypingUsers, { userId: senderId, userName: typingUserName }],
					}
				})

				const timerId = window.setTimeout(() => {
					typingExpiryTimersRef.current.delete(`${roomId}:${senderId}`)
					setTypingUsersByConversation((previous) => {
						const currentTypingUsers = previous[roomId] ?? []
						const nextTypingUsers = currentTypingUsers.filter((item) => item.userId !== senderId)

						if (nextTypingUsers.length === currentTypingUsers.length) {
							return previous
						}

						if (nextTypingUsers.length === 0) {
							const next = { ...previous }
							delete next[roomId]
							return next
						}

						return {
							...previous,
							[roomId]: nextTypingUsers,
						}
					})
				}, 3000)

				typingExpiryTimersRef.current.set(`${roomId}:${senderId}`, timerId)
				return
			}

			clearTypingExpiryTimer(roomId, senderId)
			setTypingUsersByConversation((previous) => {
				const currentTypingUsers = previous[roomId] ?? []
				const nextTypingUsers = currentTypingUsers.filter((item) => item.userId !== senderId)

				if (nextTypingUsers.length === currentTypingUsers.length) {
					return previous
				}

				if (nextTypingUsers.length === 0) {
					const next = { ...previous }
					delete next[roomId]
					return next
				}

				return {
					...previous,
					[roomId]: nextTypingUsers,
				}
			})
		}

		const previousTypingRoomId = subscribedTypingRoomIdRef.current
		if (previousTypingRoomId !== null && previousTypingRoomId !== roomId) {
			chatSocketRef.current.unsubscribeTyping(previousTypingRoomId)
			clearTypingStateForRoom(previousTypingRoomId)
		}

		if (previousRoomId === roomId) {
			if (previousTypingRoomId === roomId) {
				return
			}

			let isDisposed = false
			const waitForTypingConnection = window.setInterval(() => {
				if (isDisposed || !chatSocketRef.current.isConnected()) {
					return
				}

				try {
					chatSocketRef.current.subscribeToTyping(roomId, handleTypingEvent)
					subscribedTypingRoomIdRef.current = roomId
					window.clearInterval(waitForTypingConnection)
				} catch {
					// Wait until client is fully connected.
				}
			}, 200)

			return () => {
				isDisposed = true
				window.clearInterval(waitForTypingConnection)
			}
		}

		if (previousTypingRoomId === roomId) {
			return
		}

		let isDisposed = false
		const waitForConnection = window.setInterval(() => {
			if (isDisposed || !chatSocketRef.current.isConnected()) {
				return
			}

			try {
				chatSocketRef.current.subscribe(roomId, appendIncomingMessage)
				chatSocketRef.current.subscribeToTyping(roomId, handleTypingEvent)
				subscribedRoomIdRef.current = roomId
				subscribedTypingRoomIdRef.current = roomId
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
		if (activeView === 'friend-requests') {
			return (
				<FriendRequestsPage
					friendships={{
						incoming: incomingFriendRequests,
						sent: sentFriendRequests,
					}}
					friendshipStatus={friendshipStatus}
					isFriendshipsLoading={isFriendshipsLoading}
					onRespondToFriendRequest={handleRespondToFriendRequest}
					onCancelFriendRequest={handleCancelFriendRequest}
				/>
			)
		}

		if (activeView === 'people') {
			return (
				<FindPeoplePage
					currentUserId={currentUserProfile?.id ?? session?.user.id}
					friendships={{
						incoming: incomingFriendRequests,
						sent: sentFriendRequests,
						friends,
					}}
					onSendFriendRequest={handleSendFriendRequest}
				/>
			)
		}

		if (activeView === 'profile') {
			return (
				<ProfilePage
					session={session}
					currentUser={currentUserProfile}
					friendships={{
						friends,
					}}
					isFriendshipsLoading={isFriendshipsLoading}
					onUploadProfileImage={handleUploadProfileImage}
				/>
			)
		}

		if (activeView === 'settings') {
			return (
				<SettingsPage
					themeMode={themeMode}
					isDarkMode={isDarkMode}
					onThemeModeChange={setThemeMode}
					sessionName={session?.user.name}
					backendStatus={backendStatus}
					onLogout={handleLogout}
				/>
			)
		}

		if (isMobile) {
			if (mobilePane === 'sidebar') {
				return (
					<Sidebar
						activeView={activeView}
						onSectionChange={handleSectionChange}
						onNewChat={handleNewChat}
						currentUserName={sidebarUserName}
						currentUserProfileImageUrl={sidebarUserProfileImageUrl}
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
					typingIndicatorText={activeTypingText}
					currentUserId={currentUserProfile?.id ?? session?.user.id}
					roomMembers={activeRoomMembers}
					isRoomMembersLoading={isRoomMembersLoading}
					roomMembersStatus={roomMembersStatus}
					onSendMessage={handleSendMessage}
					onTypingStart={handleTypingStart}
					onTypingStop={handleTypingStop}
					onUploadMedia={handleUploadMedia}
					onAddUsersToRoom={handleAddUsersToRoom}
					onUpdateRoomDetails={handleUpdateRoomDetails}
					onRemoveMembersFromRoom={handleRemoveMembersFromRoom}
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
						typingIndicatorText={activeTypingText}
						currentUserId={currentUserProfile?.id ?? session?.user.id}
						roomMembers={activeRoomMembers}
						isRoomMembersLoading={isRoomMembersLoading}
						roomMembersStatus={roomMembersStatus}
						onSendMessage={handleSendMessage}
						onTypingStart={handleTypingStart}
						onTypingStop={handleTypingStop}
						onUploadMedia={handleUploadMedia}
						onAddUsersToRoom={handleAddUsersToRoom}
						onUpdateRoomDetails={handleUpdateRoomDetails}
						onRemoveMembersFromRoom={handleRemoveMembersFromRoom}
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
					typingIndicatorText={activeTypingText}
					currentUserId={currentUserProfile?.id ?? session?.user.id}
					roomMembers={activeRoomMembers}
					isRoomMembersLoading={isRoomMembersLoading}
					roomMembersStatus={roomMembersStatus}
					onSendMessage={handleSendMessage}
					onTypingStart={handleTypingStart}
					onTypingStop={handleTypingStop}
					onUploadMedia={handleUploadMedia}
					onAddUsersToRoom={handleAddUsersToRoom}
					onUpdateRoomDetails={handleUpdateRoomDetails}
					onRemoveMembersFromRoom={handleRemoveMembersFromRoom}
					isSendDisabled={Boolean(session?.accessToken) && !isSocketConnected}
				/>
			</>
		)
	}

	if (!session?.accessToken) {
		return (
			<div data-theme={isDarkMode ? 'dark' : 'light'} className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
				<AuthPage
					isSubmitting={isAuthSubmitting}
					backendStatus={backendStatus}
					onLogin={handleLogin}
					onRegister={handleRegister}
				/>
			</div>
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
						currentUserName={sidebarUserName}
						currentUserProfileImageUrl={sidebarUserProfileImageUrl}
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
								currentUserName={sidebarUserName}
								currentUserProfileImageUrl={sidebarUserProfileImageUrl}
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
