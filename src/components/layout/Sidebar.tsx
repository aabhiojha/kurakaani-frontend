import { useEffect, useRef, useState } from 'react'
import { MessageSquare, PanelLeftClose, Plus, Search, Settings, UserCircle, UserPlus, Users } from 'lucide-react'
import type { ChatSection } from '../../types/chat'

export type SidebarView = ChatSection | 'people' | 'friend-requests' | 'profile' | 'settings'

type SidebarProps = {
	activeView: SidebarView
	onSectionChange: (section: SidebarView) => void
	onNewChat: (section: ChatSection) => void
	className?: string
	onToggleCollapse?: () => void
	showCollapseButton?: boolean
}

export function Sidebar({
	activeView,
	onSectionChange,
	onNewChat,
	className = '',
	onToggleCollapse,
	showCollapseButton = false,
}: SidebarProps) {
	const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false)
	const newChatMenuRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!newChatMenuRef.current) {
				return
			}

			if (!newChatMenuRef.current.contains(event.target as Node)) {
				setIsNewChatMenuOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsNewChatMenuOpen(false)
			}
		}

		document.addEventListener('keydown', handleEscape)
		return () => {
			document.removeEventListener('keydown', handleEscape)
		}
	}, [])

	const handleNewChatOption = (section: ChatSection) => {
		onNewChat(section)
		setIsNewChatMenuOpen(false)
	}

	return (
		<aside className={`motion-enter w-full shrink-0 border-r border-[var(--border)] bg-[var(--bg-soft)] px-4 py-5 md:w-[280px] lg:w-[248px] ${className}`}>
			<div className="flex h-full flex-col">
				<div className="mb-7 px-1">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Kurakaani</div>
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--status-online)]" aria-label="online" />
						</div>
						{showCollapseButton && onToggleCollapse && (
							<button
								type="button"
								onClick={onToggleCollapse}
								className="motion-interactive inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
								aria-label="collapse sidebar"
							>
								<PanelLeftClose size={16} />
							</button>
						)}
					</div>
					<p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Private Workspace</p>
				</div>

				<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--text-muted)]">Navigation</p>
				<nav className="space-y-2">
					<button
						onClick={() => onSectionChange('groups')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'groups'
								? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
								: 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
						}`}
					>
						<Users size={17} />
						Groups
					</button>
					<button
						onClick={() => onSectionChange('direct')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'direct'
								? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
								: 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
						}`}
					>
						<MessageSquare size={17} />
						Direct Messages
					</button>
					<button
						onClick={() => onSectionChange('people')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'people'
								? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
								: 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
						}`}
					>
						<Search size={17} />
						Find People
					</button>
					<button
						onClick={() => onSectionChange('friend-requests')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'friend-requests'
								? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
								: 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
						}`}
					>
						<UserPlus size={17} />
						Friend Requests
					</button>
					<button
						onClick={() => onSectionChange('settings')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'settings'
								? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
								: 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
						}`}
					>
						<Settings size={17} />
						Settings
					</button>
					<button
						onClick={() => onSectionChange('profile')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'profile'
								? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
								: 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
						}`}
					>
						<UserCircle size={17} />
						Profile
					</button>
				</nav>

				<div className="mt-auto space-y-4">
					<div ref={newChatMenuRef} className="relative">
						{isNewChatMenuOpen && (
							<div className="motion-popover absolute bottom-full left-0 mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-lg">
								<button
									type="button"
									onClick={() => handleNewChatOption('direct')}
									className="motion-interactive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
								>
									<MessageSquare size={15} />
									New DM
								</button>
								<button
									type="button"
									onClick={() => handleNewChatOption('groups')}
									className="motion-interactive mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
								>
									<Users size={15} />
									New Group
								</button>
							</div>
						)}
						<button
							onClick={() => setIsNewChatMenuOpen((previous) => !previous)}
							className="motion-interactive flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--bg-page)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-strong)]"
						>
							<Plus size={17} />
							New Chat
						</button>
					</div>
					<button className="motion-interactive text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Help</button>
				</div>
			</div>
		</aside>
	)
}
