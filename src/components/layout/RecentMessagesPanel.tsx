import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import type { ChatSection, Conversation } from '../../types/chat'
import type { FriendUserResponse } from '../../types/api/friend'
import { searchMessagesAcrossRooms } from '../../services/roomService'
import { resolveAssetUrl } from '../../lib/config'

type RecentMessagesPanelProps = {
	section: ChatSection
	conversations: Conversation[]
	selectedConversationId: number | null
	friends?: FriendUserResponse[]
	onSelectConversation: (conversationId: number) => void
	onCreateDirect: (name: string, description: string) => Promise<{ ok: boolean; error?: string }>
	onCreateGroup: (name: string, description: string) => Promise<{ ok: boolean; error?: string }>
	newChatTrigger: number
	className?: string
}

export function RecentMessagesPanel({
	section,
	conversations,
	selectedConversationId,
	friends = [],
	onSelectConversation,
	onCreateDirect,
	onCreateGroup,
	newChatTrigger,
	className = '',
}: RecentMessagesPanelProps) {
	const [createName, setCreateName] = useState('')
	const [createDescription, setCreateDescription] = useState('')
	const [isCreatingChat, setIsCreatingChat] = useState(false)
	const [createChatStatus, setCreateChatStatus] = useState<string | null>(null)
	const [isComposerOpen, setIsComposerOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [matchedRoomIds, setMatchedRoomIds] = useState<Set<number> | null>(null)
	const [isSearchingMessages, setIsSearchingMessages] = useState(false)
	const [searchStatus, setSearchStatus] = useState<string | null>(null)
	const headerTitle = section === 'groups' ? 'Groups' : 'Recent Messages'
	const searchPlaceholder = section === 'groups' ? 'Search messages in groups...' : 'Search discussions...'

	useEffect(() => {
		if (newChatTrigger > 0) {
			const timeoutId = window.setTimeout(() => setIsComposerOpen(true), 0)
			return () => window.clearTimeout(timeoutId)
		}
	}, [newChatTrigger])

	useEffect(() => {
		if (section !== 'groups') {
			const timeoutId = window.setTimeout(() => {
				setMatchedRoomIds(null)
				setSearchStatus(null)
				setIsSearchingMessages(false)
			}, 0)
			return () => window.clearTimeout(timeoutId)
		}

		const trimmed = searchQuery.trim()
		if (!trimmed) {
			const timeoutId = window.setTimeout(() => {
				setMatchedRoomIds(null)
				setSearchStatus(null)
				setIsSearchingMessages(false)
			}, 0)
			return () => window.clearTimeout(timeoutId)
		}

		let disposed = false

		const timeoutId = window.setTimeout(() => {
			if (disposed) {
				return
			}

			setIsSearchingMessages(true)
			setSearchStatus(null)

			searchMessagesAcrossRooms(trimmed)
				.then((results) => {
					if (disposed) {
						return
					}
					const groupedRoomIds = new Set(conversations.filter((conversation) => conversation.isGroup).map((conversation) => conversation.id))
					const matched = new Set(
						results
							.map((message) => message.roomId)
							.filter((roomId) => groupedRoomIds.has(roomId)),
					)
					setMatchedRoomIds(matched)
					setSearchStatus(
						matched.size > 0
							? `${matched.size} group${matched.size === 1 ? '' : 's'} with matching messages.`
							: 'No matching messages found in groups.',
					)
				})
				.catch((error: unknown) => {
					if (disposed) {
						return
					}
					setMatchedRoomIds(new Set())
					setSearchStatus(error instanceof Error ? error.message : 'Failed to search group messages.')
				})
				.finally(() => {
					if (!disposed) {
						setIsSearchingMessages(false)
					}
				})
		}, 250)

		return () => {
			disposed = true
			window.clearTimeout(timeoutId)
		}
	}, [section, searchQuery, conversations])

	const visibleConversations = useMemo(() => {
		if (section === 'groups' && searchQuery.trim()) {
			if (matchedRoomIds === null) {
				return []
			}
			return conversations.filter((conversation) => matchedRoomIds.has(conversation.id))
		}

		const lowered = searchQuery.trim().toLowerCase()
		if (!lowered) {
			return conversations
		}

		return conversations.filter((conversation) =>
			conversation.name.toLowerCase().includes(lowered) || conversation.preview.toLowerCase().includes(lowered),
		)
	}, [conversations, matchedRoomIds, searchQuery, section])

	const handleCreateChat = async (event: FormEvent) => {
		event.preventDefault()
		const trimmedName = createName.trim()
		const trimmedDescription = section === 'groups' ? createDescription.trim() : ''

		if (!trimmedName) {
			setCreateChatStatus(section === 'groups' ? 'Group name is required.' : 'Please select a friend.')
			return
		}

		setIsCreatingChat(true)
		const result = section === 'groups'
			? await onCreateGroup(trimmedName, trimmedDescription)
			: await onCreateDirect(trimmedName, '')
		setIsCreatingChat(false)

		if (result.ok) {
			setCreateName('')
			setCreateDescription('')
			setIsComposerOpen(false)
			setCreateChatStatus(section === 'groups' ? 'Group created successfully.' : 'Direct chat created successfully.')
			return
		}

		setCreateChatStatus(result.error ?? 'Failed to create chat.')
	}

	return (
		<section className={`motion-enter motion-stagger-1 w-full min-w-0 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] md:w-[340px] lg:w-[320px] ${className}`}>
			<div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{headerTitle}</h2>
						{/* <p className="text-xs text-[var(--text-muted)]">{conversations.length} active conversations</p> */}
					</div>
					<button className="motion-interactive rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]" aria-label="filter messages">
						<SlidersHorizontal size={17} />
					</button>
				</div>
				<label className="relative block">
					<Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
					<input
						type="text"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder={searchPlaceholder}
						className="motion-focus w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
					/>
				</label>
				{section === 'groups' && searchQuery.trim() && (
					<p className="mt-2 text-xs text-[var(--text-secondary)]">
						{isSearchingMessages ? 'Searching messages…' : (searchStatus ?? '\u00A0')}
					</p>
				)}
				{isComposerOpen && (
					<form onSubmit={handleCreateChat} className="motion-enter-soft mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-3">
						<div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
							<Plus size={14} />
							{section === 'groups' ? 'Create Group' : 'Create Direct Chat'}
						</div>
						{section === 'groups' ? (
							<>
								<input
									type="text"
									value={createName}
									onChange={(event) => setCreateName(event.target.value)}
									placeholder="Group name"
									className="motion-focus mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
								/>
								<input
									type="text"
									value={createDescription}
									onChange={(event) => setCreateDescription(event.target.value)}
									placeholder="Description (optional)"
									className="motion-focus mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
								/>
							</>
						) : (
							<select
								value={createName}
								onChange={(event) => setCreateName(event.target.value)}
								className="motion-focus mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
							>
								<option value="">Select a friend...</option>
								{friends.map((friend) => (
									<option key={friend.userId} value={String(friend.userId)}>
										{friend.username}
									</option>
								))}
							</select>
						)}
						<div className="flex items-center justify-between">
							<button
								type="submit"
								disabled={isCreatingChat}
								className="motion-interactive rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-page)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
							>
								{isCreatingChat ? 'Creating...' : 'Create'}
							</button>
							{createChatStatus && <span className="text-[11px] text-[var(--text-muted)]">{createChatStatus}</span>}
						</div>
					</form>
				)}
			</div>

			<div className="space-y-1 px-2 py-2">
				{visibleConversations.map((conversation) => {
					const avatarUrl = resolveAssetUrl(conversation.avatarImageUrl)
					const unreadCount = conversation.unreadCount ?? 0

					return (
						<article
						key={conversation.id}
						onClick={() => onSelectConversation(conversation.id)}
						className={`motion-interactive flex min-h-11 cursor-pointer gap-3 rounded-xl border px-3 py-3 ${
							conversation.id === selectedConversationId
								? 'border-[var(--accent)] bg-[var(--accent-soft)]'
								: 'border-transparent hover:bg-[var(--bg-soft)]'
						}`}
					>
						<div
							className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white ${
								conversation.isGroup
									? 'bg-[var(--avatar-group-bg)]'
									: conversation.id === selectedConversationId
										? 'bg-[var(--avatar-selected-bg)]'
										: 'bg-[var(--avatar-neutral-bg)]'
							}`}
						>
							{conversation.avatar}
							{avatarUrl && (
								<img
									src={avatarUrl}
									alt={conversation.name}
									className="absolute h-10 w-10 rounded-full object-cover"
									onError={(event) => {
										event.currentTarget.style.display = 'none'
									}}
								/>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="mb-0.5 flex items-center justify-between gap-2">
								<div className="flex min-w-0 items-center gap-2">
									<h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{conversation.name}</h3>
									{unreadCount > 0 && (
										<span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--bg-page)] shadow-sm">
											{unreadCount > 99 ? '99+' : unreadCount}
										</span>
									)}
								</div>
								<span className={`shrink-0 text-xs ${unreadCount > 0 ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{conversation.time}</span>
							</div>
							<p className={`truncate text-sm ${unreadCount > 0 ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
								{conversation.preview}
							</p>
						</div>
						</article>
					)
				})}
				{visibleConversations.length === 0 && (
					<div className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
						{section === 'groups' && searchQuery.trim()
							? 'No groups matched your message search.'
							: 'No conversations found.'}
					</div>
				)}
			</div>
		</section>
	)
}
