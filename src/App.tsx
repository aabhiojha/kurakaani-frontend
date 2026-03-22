import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatView } from './components/chat/ChatView'
import { ProfilePage } from './components/layout/ProfilePage'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { SettingsPage } from './components/layout/SettingsPage'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
import { conversationMessages, conversationsBySection } from './data/chatData'
import { getSession } from './lib/session'
import { getPublicAuthInfo, logout, startGoogleLogin } from './services/authService'
import { ChatSocketService } from './services/chatSocketService'
import type { SessionState } from './types/api/session'
import type { ChatSection, Message } from './types/chat'

const isChatSection = (view: SidebarView): view is ChatSection => view === 'direct' || view === 'groups'
const THEME_STORAGE_KEY = 'kurakaani-theme'
type ThemeMode = 'light' | 'dark' | 'system'

function App() {
	const [activeView, setActiveView] = useState<SidebarView>('direct')
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
	const [messagesByConversation, setMessagesByConversation] = useState<Record<number, Message[]>>(conversationMessages)
	const [selectedConversationId, setSelectedConversationId] = useState<number>(conversationsBySection.direct[0].id)
	const chatSocketRef = useRef<ChatSocketService>(new ChatSocketService())
	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'
 	const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark'

	const activeConversations = conversationsBySection[activeSection]

	const activeConversation = useMemo(
		() => activeConversations.find((conversation) => conversation.id === selectedConversationId) ?? activeConversations[0],
		[activeConversations, selectedConversationId],
	)

	const activeMessages = messagesByConversation[activeConversation.id] ?? []

	const handleSectionChange = (section: SidebarView) => {
		setActiveView(section)
		if (isChatSection(section)) {
			setSelectedConversationId(conversationsBySection[section][0].id)
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
		})

		return () => {
			chatSocketRef.current.disconnect()
		}
	}, [activeConversation.avatar, activeConversation.id, activeConversation.name, activeView, session?.accessToken])

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

	return (
		<div data-theme={isDarkMode ? 'dark' : 'light'} className="flex h-screen min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
			<Sidebar activeView={activeView} onSectionChange={handleSectionChange} />
			{activeView === 'profile' ? (
				<ProfilePage />
			) : activeView === 'settings' ? (
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
			) : (
				<>
					<RecentMessagesPanel
						section={activeSection}
						conversations={activeConversations}
						selectedConversationId={activeConversation.id}
						onSelectConversation={setSelectedConversationId}
					/>
					<ChatView conversation={activeConversation} messages={activeMessages} onSendMessage={handleSendMessage} />
				</>
			)}
		</div>
	)
}

export default App
