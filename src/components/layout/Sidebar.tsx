import { MessageSquare, Plus, Settings, UserCircle, Users } from 'lucide-react'
import type { ChatSection } from '../../types/chat'

export type SidebarView = ChatSection | 'profile'

type SidebarProps = {
	activeView: SidebarView
	onSectionChange: (section: SidebarView) => void
}

export function Sidebar({ activeView, onSectionChange }: SidebarProps) {
	return (
		<aside className="w-[230px] shrink-0 border-r border-slate-200 bg-[#F5F5F0] px-4 py-5 shadow-[2px_0_8px_rgba(15,23,42,0.04)]">
			<div className="flex h-full flex-col">
				<div className="mb-8 flex items-center gap-2 px-1">
					<div className="text-2xl font-semibold text-[#1A2B5E]">Kurakaani</div>
					<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-label="online" />
				</div>

				<nav className="space-y-2">
					<button
						onClick={() => onSectionChange('groups')}
						className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
							activeView === 'groups'
								? 'bg-white font-semibold text-[#1A2B5E] shadow-sm'
								: 'font-medium text-slate-600 hover:bg-white'
						}`}
					>
						<Users size={17} />
						Groups
					</button>
					<button
						onClick={() => onSectionChange('direct')}
						className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
							activeView === 'direct'
								? 'bg-white font-semibold text-[#1A2B5E] shadow-sm'
								: 'font-medium text-slate-600 hover:bg-white'
						}`}
					>
						<MessageSquare size={17} />
						Direct Messages
					</button>
					<button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white">
						<Settings size={17} />
						Settings
					</button>
					<button
						onClick={() => onSectionChange('profile')}
						className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
							activeView === 'profile'
								? 'bg-white font-semibold text-[#1A2B5E] shadow-sm'
								: 'font-medium text-slate-600 hover:bg-white'
						}`}
					>
						<UserCircle size={17} />
						Profile
					</button>
				</nav>

				<div className="mt-auto">
					<button className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A2B5E] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(26,43,94,0.28)] transition hover:bg-[#13214a]">
						<Plus size={17} />
						New Chat
					</button>
					<button className="text-xs font-medium text-slate-500 transition hover:text-slate-700">Help</button>
				</div>
			</div>
		</aside>
	)
}
