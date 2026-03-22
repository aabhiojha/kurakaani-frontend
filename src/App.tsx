import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutPanelLeft, MessageSquare, MessagesSquare, PanelLeftClose } from 'lucide-react'
import { ChatView } from './components/chat/ChatView'
import { ProfilePage } from './components/layout/ProfilePage'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { SettingsPage } from './components/layout/SettingsPage'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
import { conversationMessages, conversationsBySection } from './data/chatData'
import { getSession } from './lib/session'
import { getPublicAuthInfo, logout, parseSessionFromCallbackUrl, saveSession, startGoogleLogin } from './services/authService'
import { ChatSocketService } from './services/chatSocketService'
import { createRoom } from './services/roomService'
import type { SessionState } from './types/api/session'
import type { ChatSection, Conversation, Message } from './types/chat'

const isChatSection = (view: SidebarView): view is ChatSection => view === 'direct' || view === 'groups'
const THEME_STORAGE_KEY = 'kurakaani-theme'
const ACTIVE_VIEW_STORAGE_KEY = 'kurakaani-active-view'
const SELECTED_CONVERSATION_STORAGE_KEY = 'kurakaani-selected-conversation-id'
const CONVERSATIONS_STATE_STORAGE_KEY = 'kurakaani-conversations-state'
const MESSAGES_STATE_STORAGE_KEY = 'kurakaani-messages-state'
type ThemeMode = 'light' | 'dark' | 'system'
type MobilePane = 'sidebar' | 'list' | 'detail'

const isSidebarView = (value: string | null): value is SidebarView => {
	return value === 'direct' || value === 'groups' || value === 'settings' || value === 'profile'
}

const loadPersistedConversations = (): Record<ChatSection, Conversation[]> => {
	if (typeof window === 'undefined') {
		return conversationsBySection
	}

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

function App() {
	const [activeView, setActiveView] = useState<SidebarView>(() => {
		if (typeof window === 'undefined') {
			return 'direct'
		}

		const saved = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY)
		return isSidebarView(saved) ? saved : 'direct'
	})
	const [session, setSession] = useState<SessionState | null>(() => getSession())
	const [loginPath, setLoginPath] = useState('/oauth2/authorization/google')
	const [backendStatus, setBackendStatus] = useState('Checking backend connection...')
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
	const chatSocketRef = useRef<ChatSocketService>(new ChatSocketService())
	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'
 	const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark'
	const isMobile = viewportWidth < 768
	const isTablet = viewportWidth >= 768 && viewportWidth < 1024
	const isDesktop = viewportWidth >= 1024

	const activeConversations = conversationsState[activeSection]

	const activeConversation = useMemo(
		() => activeConversations.find((conversation) => conversation.id === selectedConversationId) ?? activeConversations[0],
		[activeConversations, selectedConversationId],
	)

	const activeMessages = messagesByConversation[activeConversation.id] ?? []

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
				type: 'DM',
			})) as { id?: number }

			const roomId = typeof room?.id === 'number' ? room.id : Date.now()
			createDirectConversation(roomId, name, description)
			setBackendStatus(`Direct chat "${name}" created on backend.`)
			return { ok: true }
		} catch {
			return { ok: false, error: 'Backend direct chat creation failed. Please try again.' }
		}
	}

	const handleSendMessage = (conversationId: number, text: string) => {
		if (session?.accessToken) {
			chatSocketRef.current.sendMessage(text)
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

	const handleLogin = () => {
		startGoogleLogin(loginPath)
	}

	const handleLogout = () => {
		logout()
		chatSocketRef.current.disconnect()
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
		const parsedSession = parseSessionFromCallbackUrl(window.location.href)
		if (!parsedSession) {
			return
		}

		saveSession(parsedSession)
		setSession(parsedSession)
		setBackendStatus('OAuth callback captured successfully. Signed in.')

		window.history.replaceState({}, document.title, '/')
	}, [])

	useEffect(() => {
		let isMounted = true

		const bootstrapAuth = async () => {
			try {
				const authInfo = await getPublicAuthInfo()
				if (!isMounted) {
					return
				}

				setLoginPath(authInfo.loginUrl)
				setBackendStatus(session?.accessToken ? 'Connected. Authenticated requests enabled.' : 'Connected. Sign in to enable protected endpoints.')
			} catch {
				if (isMounted) {
					setBackendStatus('Backend unavailable. Running with local mock data.')
				}
			}
		}

		bootstrapAuth()

		return () => {
			isMounted = false
		}
	}, [session?.accessToken])

	useEffect(() => {
		if (!session?.accessToken || activeView === 'settings' || activeView === 'profile') {
			chatSocketRef.current.disconnect()
			return
		}

		const roomId = activeConversation.id
		chatSocketRef.current.connect(roomId, {
			onConnect: () => {
				setBackendStatus(`Live chat connected to room ${roomId}.`)
			},
			onError: () => {
				setBackendStatus('WebSocket connection error. Falling back to local updates.')
			},
			onMessage: (payload) => {
				setMessagesByConversation((prev) => {
					const currentMessages = prev[roomId] ?? []

					const duplicatedFromOptimistic =
						currentMessages[currentMessages.length - 1]?.side === 'right' &&
						currentMessages[currentMessages.length - 1]?.text === payload.content

					if (duplicatedFromOptimistic) {
						return prev
					}

					const nextId = (currentMessages[currentMessages.length - 1]?.id ?? 0) + 1
					const timestamp = payload.createdAt
						? new Date(payload.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
						: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

					return {
						...prev,
						[roomId]: [
							...currentMessages,
							{
								id: payload.id ?? nextId,
								side: 'left',
								senderName: activeConversation.name,
								senderAvatar: activeConversation.avatar,
								text: payload.content,
								timestamp,
							},
						],
					}
				})
			},
		}, session.accessToken)

		return () => {
			chatSocketRef.current.disconnect()
		}
	}, [activeConversation.avatar, activeConversation.id, activeConversation.name, activeView, session?.accessToken])

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
					onLogin={handleLogin}
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
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}

			if (mobilePane === 'list') {
				return (
					<RecentMessagesPanel
						section={activeSection}
						conversations={activeConversations}
						selectedConversationId={activeConversation.id}
						onSelectConversation={handleSelectConversation}
						onCreateDirect={handleCreateDirect}
						onCreateGroup={handleCreateGroup}
						newChatTrigger={newChatTrigger}
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}

			return <ChatView conversation={activeConversation} messages={activeMessages} onSendMessage={handleSendMessage} />
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
					<ChatView conversation={activeConversation} messages={activeMessages} onSendMessage={handleSendMessage} />
				</>
			)
		}

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
				<ChatView conversation={activeConversation} messages={activeMessages} onSendMessage={handleSendMessage} />
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
