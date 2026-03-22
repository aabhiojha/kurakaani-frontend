import { Search, SlidersHorizontal } from 'lucide-react'
import type { ChatSection, Conversation } from '../../types/chat'

type RecentMessagesPanelProps = {
	section: ChatSection
	conversations: Conversation[]
	selectedConversationId: number
	onSelectConversation: (conversationId: number) => void
}

export function RecentMessagesPanel({ section, conversations, selectedConversationId, onSelectConversation }: RecentMessagesPanelProps) {
	const headerTitle = section === 'groups' ? 'Groups' : 'Recent Messages'
	const searchPlaceholder = section === 'groups' ? 'Search groups...' : 'Search discussions...'

	return (
		<section className="w-[300px] shrink-0 border-r border-slate-200 bg-white">
			<div className="border-b border-slate-100 px-5 py-4">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">{headerTitle}</h2>
					<button className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" aria-label="filter messages">
						<SlidersHorizontal size={17} />
					</button>
				</div>
				<label className="relative block">
					<Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
					<input
						type="text"
						placeholder={searchPlaceholder}
						className="w-full rounded-xl border border-slate-200 bg-[#F5F5F0] py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1A2B5E] focus:outline-none"
					/>
				</label>
			</div>

			<div className="space-y-1 px-2 py-2">
				{conversations.map((conversation) => (
					<article
						key={conversation.id}
						onClick={() => onSelectConversation(conversation.id)}
						className={`flex cursor-pointer gap-3 rounded-xl px-3 py-3 transition ${
							conversation.id === selectedConversationId ? 'bg-[#F2F5FF]' : 'hover:bg-slate-50'
						}`}
					>
						<div
							className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white ${
								conversation.isGroup
									? 'bg-teal-600'
									: conversation.id === selectedConversationId
										? 'bg-[#1A2B5E]'
										: 'bg-slate-400'
							}`}
						>
							{conversation.avatar}
						</div>
						<div className="min-w-0 flex-1">
							<div className="mb-0.5 flex items-center justify-between gap-2">
								<h3 className="truncate text-sm font-semibold text-slate-900">{conversation.name}</h3>
								<span className="shrink-0 text-xs text-slate-400">{conversation.time}</span>
							</div>
							<p className="truncate text-sm text-slate-500">{conversation.preview}</p>
						</div>
					</article>
				))}
			</div>
		</section>
	)
}
