import { useMemo, useState } from 'react'
import { ChatView } from './components/chat/ChatView'
import { ProfilePage } from './components/layout/ProfilePage'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
import { conversationMessages, conversationsBySection } from './data/chatData'
import type { ChatSection, Message } from './types/chat'

function App() {
	const [activeView, setActiveView] = useState<SidebarView>('direct')
	const [messagesByConversation, setMessagesByConversation] = useState<Record<number, Message[]>>(conversationMessages)
	const [selectedConversationId, setSelectedConversationId] = useState<number>(conversationsBySection.direct[0].id)
	const activeSection: ChatSection = activeView === 'profile' ? 'direct' : activeView

	const activeConversations = conversationsBySection[activeSection]

	const activeConversation = useMemo(
		() => activeConversations.find((conversation) => conversation.id === selectedConversationId) ?? activeConversations[0],
		[activeConversations, selectedConversationId],
	)

	const activeMessages = messagesByConversation[activeConversation.id] ?? []

	const handleSectionChange = (section: SidebarView) => {
		setActiveView(section)
		if (section !== 'profile') {
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
		<div className="flex h-screen min-h-screen bg-[#F5F5F0] text-slate-900 antialiased">
			<Sidebar activeView={activeView} onSectionChange={handleSectionChange} />
			{activeView === 'profile' ? (
				<ProfilePage />
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
