import { useMemo, useState } from 'react'
import { ChatView } from './components/chat/ChatView'
import { ProfilePage } from './components/layout/ProfilePage'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { SettingsPage } from './components/layout/SettingsPage'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
import { conversationMessages, conversationsBySection } from './data/chatData'
import type { ChatSection, Message } from './types/chat'

const isChatSection = (view: SidebarView): view is ChatSection => view === 'direct' || view === 'groups'

function App() {
	const [activeView, setActiveView] = useState<SidebarView>('direct')
	const [isDarkMode, setIsDarkMode] = useState(false)
	const [messagesByConversation, setMessagesByConversation] = useState<Record<number, Message[]>>(conversationMessages)
	const [selectedConversationId, setSelectedConversationId] = useState<number>(conversationsBySection.direct[0].id)
	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'

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

	return (
		<div data-theme={isDarkMode ? 'dark' : 'light'} className="flex h-screen min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
			<Sidebar activeView={activeView} onSectionChange={handleSectionChange} />
			{activeView === 'profile' ? (
				<ProfilePage />
			) : activeView === 'settings' ? (
				<SettingsPage isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode((prev) => !prev)} />
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
