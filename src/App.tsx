import { useEffect, useMemo, useState } from 'react'
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
import {
	buildSessionFromAuth,
	getCurrentUser,
	loginWithPassword,
	logout,
	registerWithPassword,
	saveSession,
	uploadProfileImage,
} from './services/authService'
import { addUsersToRoom, getRooms } from './services/roomService'
import { GLOBAL_ROOM_ID } from './lib/config'
import { getSession } from './lib/session'
import { isChatSection, getErrorMessage } from './lib/chatUtils'
import { useTheme } from './hooks/useTheme'
import { useLayout } from './hooks/useLayout'
import { useFriendships } from './hooks/useFriendships'
import { useRooms } from './hooks/useRooms'
import { useChatSocket } from './hooks/useChatSocket'
import type { ChatSection } from './types/chat'
import type { CurrentUserResponse, SessionState } from './types/api/session'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

const ACTIVE_VIEW_STORAGE_KEY = 'kurakaani-active-view'

const isSidebarView = (value: string | null): value is SidebarView =>
	value === 'direct' ||
	value === 'groups' ||
	value === 'people' ||
	value === 'friend-requests' ||
	value === 'settings' ||
	value === 'profile'

function App() {
	const [activeView, setActiveView] = useState<SidebarView>(() => {
		if (typeof window === 'undefined') return 'direct'
		const saved = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY)
		return isSidebarView(saved) ? saved : 'direct'
	})
	const [session, setSession] = useState<SessionState | null>(() => getSession())
	const [backendStatus, setBackendStatus] = useState('Checking backend connection...')
	const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
	const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserResponse | undefined>(undefined)
	const attemptedGlobalJoinIdsRef = useMemo(() => new Set<number>(), [])

	const { themeMode, isDarkMode, setThemeMode } = useTheme()

	const layout = useLayout(activeView)
	const { isMobile, isTablet, isDesktop, mobilePane, setMobilePane, isSidebarDrawerOpen, setIsSidebarDrawerOpen, isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed } = layout

	const friendships = useFriendships()

	const rooms = useRooms(session, currentUserProfile, setBackendStatus, (view) =>
		setActiveView(view),
	)
	const {
		conversationsState,
		messagesByConversation,
		setMessagesByConversation,
		selectedConversationId,
		setSelectedConversationId,
		newChatTrigger,
		setNewChatTrigger,
		roomMembersByConversation,
		roomMembersStatus,
		isRoomMembersLoading,
		pendingMediaUploadsRef,
		loadRoomMembers,
		handleCreateGroup,
		handleCreateDirect,
		handleAddUsersToRoom,
		handleUpdateRoomDetails,
		handleRemoveMembersFromRoom,
		handleUploadMedia,
		clearRooms,
	} = rooms

	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'
	const activeConversations = conversationsState[activeSection]

	const activeConversation = useMemo(() => {
		if (selectedConversationId === null) return undefined
		return (
			conversationsState[activeSection].find((c) => c.id === selectedConversationId) ??
			conversationsState.direct.find((c) => c.id === selectedConversationId) ??
			conversationsState.groups.find((c) => c.id === selectedConversationId)
		)
	}, [activeSection, conversationsState, selectedConversationId])

	const activeMessages = activeConversation ? (messagesByConversation[activeConversation.id] ?? []) : []
	const activeRoomMembers = activeConversation ? (roomMembersByConversation[activeConversation.id] ?? []) : []

	const chatSocket = useChatSocket({
		session,
		activeConversation,
		activeView,
		currentUserProfile,
		messagesByConversation,
		pendingMediaUploadsRef,
		setMessagesByConversation,
		onNotification: (type, payload, userId) =>
			friendships.handleFriendshipNotification(type, payload, userId),
		setBackendStatus,
	})
	const { isSocketConnected, typingUsersByConversation, handleTypingStart, handleTypingStop, handleSendMessage, disconnectAndCleanup } = chatSocket

	const activeTypingUsers = activeConversation ? (typingUsersByConversation[activeConversation.id] ?? []) : []
	const activeTypingText = useMemo(() => {
		if (activeTypingUsers.length === 0) return null
		const names = activeTypingUsers.map((u) => u.userName)
		if (names.length === 1) return `${names[0]} is typing...`
		return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are typing...`
	}, [activeTypingUsers])

	const sidebarUserName = currentUserProfile?.userName ?? session?.user.name
	const sidebarUserProfileImageUrl = currentUserProfile?.profileImageUrl ?? session?.user.profileImageUrl

	// ── Persistence ───────────────────────────────────────────────────────────

	useEffect(() => {
		window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView)
	}, [activeView])

	useEffect(() => {
		setBackendStatus(
			session?.accessToken
				? 'Authenticated requests enabled.'
				: 'Sign in to enable protected endpoints.',
		)
	}, [session?.accessToken])

	// Sync current user profile on login
	useEffect(() => {
		if (!session?.accessToken) {
			setCurrentUserProfile(undefined)
			return
		}
		let cancelled = false
		getCurrentUser()
			.then((user) => { if (!cancelled) setCurrentUserProfile(user) })
			.catch(() => { if (!cancelled) setCurrentUserProfile(undefined) })
		return () => { cancelled = true }
	}, [session?.accessToken])

	// Load friendships on login
	useEffect(() => {
		if (!session?.accessToken) {
			friendships.clearFriendships()
			return
		}
		void friendships.loadFriendships()
	}, [session?.accessToken])

	// Load room members when the active conversation changes
	useEffect(() => {
		if (!session?.accessToken || !activeConversation) return
		void loadRoomMembers(activeConversation.id)
	}, [activeConversation?.id, session?.accessToken])

	// Ensure global room membership when user profile resolves
	useEffect(() => {
		if (!session?.accessToken) return
		void ensureGlobalRoomMembership(session, currentUserProfile)
	}, [currentUserProfile, session])

	// ── Auth helpers ──────────────────────────────────────────────────────────

	const ensureGlobalRoomMembership = async (
		sessionState: SessionState,
		profile?: CurrentUserResponse,
	) => {
		const userId = profile?.id ?? sessionState.user.id
		if (!userId || attemptedGlobalJoinIdsRef.has(userId)) return false
		attemptedGlobalJoinIdsRef.add(userId)
		try {
			const roomList = await getRooms()
			if (roomList.some((r) => r.id === GLOBAL_ROOM_ID)) return false
		} catch {
			// Fall back to add attempt.
		}
		try {
			await addUsersToRoom(GLOBAL_ROOM_ID, [userId])
			return true
		} catch {
			return false
		}
	}

	const completeAuthenticatedSession = async (authResponse: {
		token: string
		username: string
		roles: string[]
	}) => {
		let profile: CurrentUserResponse | undefined
		try { profile = await getCurrentUser() } catch { /* */ }

		const nextSession = buildSessionFromAuth(authResponse, profile)
		saveSession(nextSession)
		setSession(nextSession)
		setCurrentUserProfile(profile)

		const joined = await ensureGlobalRoomMembership(nextSession, profile)
		setBackendStatus(
			joined
				? `Signed in as ${nextSession.user.name}. Joined global room ${GLOBAL_ROOM_ID}.`
				: `Signed in as ${nextSession.user.name}. Authenticated requests enabled.`,
		)

		setActiveView('groups')
		setSelectedConversationId(null)
		if (isMobile) setMobilePane('list')
	}

	const handleLogin = async (username: string, password: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)
		try {
			const authResponse = await loginWithPassword({ username, password })
			await completeAuthenticatedSession(authResponse)
			return { ok: true }
		} catch (error) {
			return { ok: false, error: getErrorMessage(error, 'Login failed. Please check your credentials.') }
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handleRegister = async (
		username: string,
		email: string,
		password: string,
	): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)
		try {
			await registerWithPassword({ username, email, password })
			const authResponse = await loginWithPassword({ username, password })
			await completeAuthenticatedSession(authResponse)
			return { ok: true, message: 'Registration successful. You have been added to the global chat.' }
		} catch (error) {
			return { ok: false, error: getErrorMessage(error, 'Registration failed. Please try again.') }
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handleLogout = () => {
		logout()
		disconnectAndCleanup()
		friendships.clearFriendships()
		clearRooms()
		attemptedGlobalJoinIdsRef.clear()
		setSession(null)
		setCurrentUserProfile(undefined)
		setBackendStatus('Logged out. API requests now run without JWT.')
	}

	const handleUploadProfileImage = async (file: File) => {
		if (!session?.accessToken) throw new Error('Sign in to upload a profile image.')
		await uploadProfileImage(file)
		const refreshed = await getCurrentUser()
		setCurrentUserProfile(refreshed)
		setSession((prev) => {
			if (!prev) return prev
			const next: SessionState = {
				...prev,
				user: {
					...prev.user,
					id: refreshed.id,
					email: refreshed.email,
					name: refreshed.userName,
					roles: refreshed.roles,
					profileImageUrl: refreshed.profileImageUrl,
				},
			}
			saveSession(next)
			return next
		})
		setBackendStatus('Profile image updated successfully.')
	}

	// ── Navigation handlers ───────────────────────────────────────────────────

	const handleSectionChange = (section: SidebarView) => {
		setActiveView(section)
		if (isMobile) setMobilePane(isChatSection(section) ? 'list' : 'detail')
		setIsSidebarDrawerOpen(false)
	}

	const handleNewChat = (section: ChatSection) => {
		setActiveView(section)
		setNewChatTrigger((prev) => prev + 1)
		if (isMobile) setMobilePane('list')
		setIsSidebarDrawerOpen(false)
	}

	const handleSelectConversation = (conversationId: number) => {
		setSelectedConversationId(conversationId)
		if (isMobile) setMobilePane('detail')
	}

	// ── Render ────────────────────────────────────────────────────────────────

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

	const sharedChatViewProps = {
		messages: activeMessages,
		typingIndicatorText: activeTypingText,
		currentUserId: currentUserProfile?.id ?? session?.user.id,
		roomMembers: activeRoomMembers,
		isRoomMembersLoading,
		roomMembersStatus,
		onSendMessage: handleSendMessage,
		onTypingStart: handleTypingStart,
		onTypingStop: handleTypingStop,
		onUploadMedia: handleUploadMedia,
		onAddUsersToRoom: handleAddUsersToRoom,
		onUpdateRoomDetails: handleUpdateRoomDetails,
		onRemoveMembersFromRoom: handleRemoveMembersFromRoom,
		isSendDisabled: Boolean(session?.accessToken) && !isSocketConnected,
	} as const

	const sharedRecentPanelProps = {
		section: activeSection,
		conversations: activeConversations,
		selectedConversationId: activeConversation?.id ?? -1,
		friends: friendships.friends,
		onSelectConversation: handleSelectConversation,
		onCreateDirect: handleCreateDirect,
		onCreateGroup: handleCreateGroup,
		newChatTrigger,
	} as const

	const renderMainContent = () => {
		if (activeView === 'friend-requests') {
			return (
				<FriendRequestsPage
					friendships={{ incoming: friendships.incomingFriendRequests, sent: friendships.sentFriendRequests }}
					friendshipStatus={friendships.friendshipStatus}
					isFriendshipsLoading={friendships.isFriendshipsLoading}
					onRespondToFriendRequest={friendships.handleRespondToFriendRequest}
					onCancelFriendRequest={friendships.handleCancelFriendRequest}
				/>
			)
		}

		if (activeView === 'people') {
			return (
				<FindPeoplePage
					currentUserId={currentUserProfile?.id ?? session?.user.id}
					friendships={{
						incoming: friendships.incomingFriendRequests,
						sent: friendships.sentFriendRequests,
						friends: friendships.friends,
					}}
					onSendFriendRequest={friendships.handleSendFriendRequest}
				/>
			)
		}

		if (activeView === 'profile') {
			return (
				<ProfilePage
					session={session}
					currentUser={currentUserProfile}
					friendships={{ friends: friendships.friends }}
					isFriendshipsLoading={friendships.isFriendshipsLoading}
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
						{...sharedRecentPanelProps}
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}
			return <ChatView conversation={activeConversation} {...sharedChatViewProps} />
		}

		return (
			<>
				<RecentMessagesPanel {...sharedRecentPanelProps} className="h-full" />
				<ChatView conversation={activeConversation} {...sharedChatViewProps} />
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
						<div className="h-full w-fit" onClick={(e) => e.stopPropagation()}>
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
								onClick={() => setIsSidebarDrawerOpen((prev) => !prev)}
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
