import { useEffect, useRef, useState } from 'react'
import { MessageSquare, PanelLeftClose, Plus, Search, Settings, UserPlus, Users } from 'lucide-react'
import type { ChatSection } from '../../types/chat'
import { resolveAssetUrl } from '../../lib/config'

export type SidebarView = ChatSection | 'people' | 'friend-requests' | 'profile' | 'settings'

type SidebarProps = {
	activeView: SidebarView
	onSectionChange: (section: SidebarView) => void
	onNewChat: (section: ChatSection) => void
	currentUserName?: string
	currentUserProfileImageUrl?: string
	className?: string
	onToggleCollapse?: () => void
	showCollapseButton?: boolean
}

export function Sidebar({
	activeView,
	onSectionChange,
	onNewChat,
	currentUserName,
	currentUserProfileImageUrl,
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

	const profileAvatarUrl = resolveAssetUrl(currentUserProfileImageUrl)
	const profileName = (currentUserName ?? 'Profile').trim() || 'Profile'
	const profileInitials = profileName
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('') || 'PR'

	return (
		<aside className={`motion-enter w-full shrink-0 border-r border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-5 shadow-[var(--nav-shadow)] md:w-[280px] lg:w-[248px] ${className}`}>
			<div className="flex h-full flex-col">
				<div className="mb-7 px-1">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className="text-2xl font-semibold tracking-tight text-[var(--nav-text-primary)]">Kurakaani</div>
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--status-online)]" aria-label="online" />
						</div>
						{showCollapseButton && onToggleCollapse && (
							<button
								type="button"
								onClick={onToggleCollapse}
								className="motion-interactive inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--nav-border)] bg-[var(--nav-surface)] px-3 text-[var(--nav-text-secondary)] hover:text-[var(--nav-text-primary)]"
								aria-label="collapse sidebar"
							>
								<PanelLeftClose size={16} />
							</button>
						)}
					</div>
				</div>

				<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--nav-text-muted)]">Navigation</p>
				<nav className="space-y-2">
					<button
						onClick={() => onSectionChange('groups')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'groups'
								? 'bg-[var(--nav-surface)] font-semibold text-[var(--nav-text-primary)] shadow-sm'
								: 'font-medium text-[var(--nav-text-secondary)] hover:bg-[var(--nav-surface-hover)]'
						}`}
					>
						<Users size={17} />
						Groups
					</button>
					<button
						onClick={() => onSectionChange('direct')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'direct'
								? 'bg-[var(--nav-surface)] font-semibold text-[var(--nav-text-primary)] shadow-sm'
								: 'font-medium text-[var(--nav-text-secondary)] hover:bg-[var(--nav-surface-hover)]'
						}`}
					>
						<MessageSquare size={17} />
						Direct Messages
					</button>
					<button
						onClick={() => onSectionChange('people')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'people'
								? 'bg-[var(--nav-surface)] font-semibold text-[var(--nav-text-primary)] shadow-sm'
								: 'font-medium text-[var(--nav-text-secondary)] hover:bg-[var(--nav-surface-hover)]'
						}`}
					>
						<Search size={17} />
						Find People
					</button>
					<button
						onClick={() => onSectionChange('friend-requests')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'friend-requests'
								? 'bg-[var(--nav-surface)] font-semibold text-[var(--nav-text-primary)] shadow-sm'
								: 'font-medium text-[var(--nav-text-secondary)] hover:bg-[var(--nav-surface-hover)]'
						}`}
					>
						<UserPlus size={17} />
						Friend Requests
					</button>
					<button
						onClick={() => onSectionChange('settings')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'settings'
								? 'bg-[var(--nav-surface)] font-semibold text-[var(--nav-text-primary)] shadow-sm'
								: 'font-medium text-[var(--nav-text-secondary)] hover:bg-[var(--nav-surface-hover)]'
						}`}
					>
						<Settings size={17} />
						Settings
					</button>
					<button
						onClick={() => onSectionChange('profile')}
						className={`motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
							activeView === 'profile'
								? 'bg-[var(--nav-surface)] font-semibold text-[var(--nav-text-primary)] shadow-sm'
								: 'font-medium text-[var(--nav-text-secondary)] hover:bg-[var(--nav-surface-hover)]'
						}`}
					>
						<div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-[11px] font-semibold text-white">
							{profileAvatarUrl ? (
								<img src={profileAvatarUrl} alt={profileName} className="h-full w-full object-cover" />
							) : (
								profileInitials
							)}
						</div>
						<span className="truncate">{profileName}</span>
					</button>
				</nav>

				<div className="mt-auto space-y-4">
					<div ref={newChatMenuRef} className="relative">
						{isNewChatMenuOpen && (
							<div className="motion-popover absolute bottom-full left-0 mb-2 w-full rounded-xl border border-[var(--nav-border)] bg-[var(--nav-surface)] p-2 shadow-lg">
								<button
									type="button"
									onClick={() => handleNewChatOption('direct')}
									className="motion-interactive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--nav-text-primary)] hover:bg-[var(--nav-surface-hover)]"
								>
									<MessageSquare size={15} />
									New DM
								</button>
								<button
									type="button"
									onClick={() => handleNewChatOption('groups')}
									className="motion-interactive mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--nav-text-primary)] hover:bg-[var(--nav-surface-hover)]"
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
					{/* <button className="motion-interactive text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"></button> */}
				</div>
			</div>
		</aside>
	)
}
