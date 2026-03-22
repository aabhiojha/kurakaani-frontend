import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import type { ChatSection, Conversation } from '../../types/chat'

type RecentMessagesPanelProps = {
	section: ChatSection
	conversations: Conversation[]
	selectedConversationId: number
	onSelectConversation: (conversationId: number) => void
	onCreateDirect: (name: string, description: string) => Promise<{ ok: boolean; error?: string }>
	onCreateGroup: (name: string, description: string) => Promise<{ ok: boolean; error?: string }>
	newChatTrigger: number
}

export function RecentMessagesPanel({
	section,
	conversations,
	selectedConversationId,
	onSelectConversation,
	onCreateDirect,
	onCreateGroup,
	newChatTrigger,
}: RecentMessagesPanelProps) {
	const [createName, setCreateName] = useState('')
	const [createDescription, setCreateDescription] = useState('')
	const [isCreatingChat, setIsCreatingChat] = useState(false)
	const [createChatStatus, setCreateChatStatus] = useState<string | null>(null)
	const [isComposerOpen, setIsComposerOpen] = useState(false)
	const headerTitle = section === 'groups' ? 'Groups' : 'Recent Messages'
	const searchPlaceholder = section === 'groups' ? 'Search groups...' : 'Search discussions...'

	useEffect(() => {
		if (newChatTrigger > 0) {
			setIsComposerOpen(true)
		}
	}, [newChatTrigger])

	const handleCreateChat = async (event: FormEvent) => {
		event.preventDefault()
		const trimmedName = createName.trim()
		const trimmedDescription = createDescription.trim()

		if (!trimmedName) {
			setCreateChatStatus(section === 'groups' ? 'Group name is required.' : 'Name is required.')
			return
		}

		setIsCreatingChat(true)
		const result = section === 'groups'
			? await onCreateGroup(trimmedName, trimmedDescription)
			: await onCreateDirect(trimmedName, trimmedDescription)
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
		<section className="motion-enter motion-stagger-1 w-[300px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)]">
			<div className="border-b border-[var(--border)] px-5 py-4">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{headerTitle}</h2>
						<p className="text-xs text-[var(--text-muted)]">{conversations.length} active conversations</p>
					</div>
					<button className="motion-interactive rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]" aria-label="filter messages">
						<SlidersHorizontal size={17} />
					</button>
				</div>
				<label className="relative block">
					<Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
					<input
						type="text"
						placeholder={searchPlaceholder}
						className="motion-focus w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
					/>
				</label>
				{isComposerOpen && (
					<form onSubmit={handleCreateChat} className="motion-enter-soft mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-3">
						<div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
							<Plus size={14} />
							{section === 'groups' ? 'Create Group' : 'Create Direct Chat'}
						</div>
						<input
							type="text"
							value={createName}
							onChange={(event) => setCreateName(event.target.value)}
							placeholder={section === 'groups' ? 'Group name' : 'Person name'}
							className="motion-focus mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
						/>
						<input
							type="text"
							value={createDescription}
							onChange={(event) => setCreateDescription(event.target.value)}
							placeholder={section === 'groups' ? 'Description (optional)' : 'Intro message (optional)'}
							className="motion-focus mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
						/>
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
				{conversations.map((conversation) => (
					<article
						key={conversation.id}
						onClick={() => onSelectConversation(conversation.id)}
						className={`motion-interactive flex cursor-pointer gap-3 rounded-xl border px-3 py-3 ${
							conversation.id === selectedConversationId
								? 'border-[var(--accent)] bg-[var(--accent-soft)]'
								: 'border-transparent hover:bg-[var(--bg-soft)]'
						}`}
					>
						<div
							className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white ${
								conversation.isGroup
									? 'bg-[var(--avatar-group-bg)]'
									: conversation.id === selectedConversationId
										? 'bg-[var(--avatar-selected-bg)]'
										: 'bg-[var(--avatar-neutral-bg)]'
							}`}
						>
							{conversation.avatar}
						</div>
						<div className="min-w-0 flex-1">
							<div className="mb-0.5 flex items-center justify-between gap-2">
								<h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{conversation.name}</h3>
								<span className="shrink-0 text-xs text-[var(--text-muted)]">{conversation.time}</span>
							</div>
							<p className="truncate text-sm text-[var(--text-secondary)]">{conversation.preview}</p>
						</div>
					</article>
				))}
			</div>
		</section>
	)
}
