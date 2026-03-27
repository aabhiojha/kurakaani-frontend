import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { CircleEllipsis, Image as ImageIcon, Plus, Search, SendHorizontal, Smile, UserPlus, Users } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import type { Conversation, Message } from '../../types/chat'
import type { RoomMemberResponse } from '../../types/api/room'

const RIGHT_PANEL_MODE_STORAGE_KEY = 'kurakaani-chat-right-panel-mode'
const RIGHT_PANEL_WIDTH_STORAGE_KEY = 'kurakaani-chat-right-panel-width'

type ChatViewProps = {
	conversation?: Conversation
	messages: Message[]
	currentUserId?: number
	roomMembers?: RoomMemberResponse[]
	isRoomMembersLoading?: boolean
	roomMembersStatus?: string | null
	onSendMessage: (conversationId: number, text: string) => void
	onUploadMedia?: (conversationId: number, file: File, caption?: string) => void | Promise<void>
	onAddUsersToRoom?: (conversationId: number, userIds: number[]) => Promise<void>
	onUpdateRoomDetails?: (conversationId: number, updates: { name?: string; description?: string }) => Promise<void>
	onRemoveMembersFromRoom?: (conversationId: number, memberIds: number[]) => Promise<void>
	isSendDisabled?: boolean
}

export function ChatView({
	conversation,
	messages,
	currentUserId,
	roomMembers = [],
	isRoomMembersLoading = false,
	roomMembersStatus = null,
	onSendMessage,
	onUploadMedia,
	onAddUsersToRoom,
	onUpdateRoomDetails,
	onRemoveMembersFromRoom,
	isSendDisabled = false,
}: ChatViewProps) {
	if (!conversation) {
		return (
			<section className="motion-enter motion-stagger-2 flex min-w-0 flex-1 flex-col items-center justify-center bg-[var(--bg-surface)]">
				<div className="text-center">
					<h2 className="text-lg font-semibold text-[var(--text-primary)]">Click on a group to start chatting</h2>
					<p className="text-[var(--text-secondary)]">Pick a group from the list to open the conversation.</p>
				</div>
			</section>
		)
	}

	const [draft, setDraft] = useState('')
	const [isEmojiOpen, setIsEmojiOpen] = useState(false)
	const [rightPanelMode, setRightPanelMode] = useState<'settings' | 'info' | null>(() => {
		if (typeof window === 'undefined') {
			return null
		}

		const saved = window.localStorage.getItem(RIGHT_PANEL_MODE_STORAGE_KEY)
		return saved === 'settings' || saved === 'info' ? saved : null
	})
	const [rightPanelWidth, setRightPanelWidth] = useState(() => {
		if (typeof window === 'undefined') {
			return 360
		}

		const saved = Number(window.localStorage.getItem(RIGHT_PANEL_WIDTH_STORAGE_KEY))
		if (Number.isNaN(saved)) {
			return 360
		}

		return Math.max(320, Math.min(560, saved))
	})
	const [isResizingRightPanel, setIsResizingRightPanel] = useState(false)
	const [inviteValue, setInviteValue] = useState('')
	const [inviteError, setInviteError] = useState<string | null>(null)
	const [isInviting, setIsInviting] = useState(false)
	const [roomNameInput, setRoomNameInput] = useState(conversation.name)
	const [roomDescriptionInput, setRoomDescriptionInput] = useState(conversation.description ?? '')
	const [roomSettingsError, setRoomSettingsError] = useState<string | null>(null)
	const [isUpdatingRoom, setIsUpdatingRoom] = useState(false)
	const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)
	const layoutRef = useRef<HTMLElement | null>(null)
	const messagesContainerRef = useRef<HTMLDivElement | null>(null)
	const messagesContentRef = useRef<HTMLDivElement | null>(null)
	const emojiPickerRef = useRef<HTMLDivElement | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const shouldStickToBottomRef = useRef(true)
	const emojiOptions = ['😀', '😂', '😍', '👍', '🔥', '🎉', '🙏', '💬']
	const isCurrentUserAdmin = conversation.isGroup && typeof currentUserId === 'number'
		? roomMembers.some((member) => member.userId === currentUserId && member.roomRole.toUpperCase() === 'ADMIN')
		: false
	const isRightPanelOpen = rightPanelMode !== null

	const getSenderKey = (message: Message) => {
		if (typeof message.senderId === 'number' && message.senderId > 0) {
			return `${message.isSent ? 'sent' : 'received'}:${message.senderId}`
		}

		return `${message.isSent ? 'sent' : 'received'}:${message.senderName}`
	}

	const isGroupedWith = (left?: Message, right?: Message) => {
		if (!left || !right) {
			return false
		}

		return getSenderKey(left) === getSenderKey(right)
	}

	const scrollMessagesToBottom = () => {
		const container = messagesContainerRef.current
		if (!container) {
			return
		}

		container.scrollTop = container.scrollHeight
	}

	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) {
			return
		}

		const handleScroll = () => {
			const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
			shouldStickToBottomRef.current = distanceToBottom <= 24
		}

		handleScroll()
		container.addEventListener('scroll', handleScroll)

		return () => {
			container.removeEventListener('scroll', handleScroll)
		}
	}, [conversation.id])

	useEffect(() => {
		shouldStickToBottomRef.current = true
		scrollMessagesToBottom()
		requestAnimationFrame(() => {
			scrollMessagesToBottom()
		})
		window.setTimeout(() => {
			scrollMessagesToBottom()
		}, 80)
	}, [conversation.id])

	useEffect(() => {
		if (!shouldStickToBottomRef.current) {
			return
		}

		scrollMessagesToBottom()
		requestAnimationFrame(() => {
			scrollMessagesToBottom()
		})
	}, [messages])

	useEffect(() => {
		const container = messagesContainerRef.current
		const content = messagesContentRef.current
		if (!container || !content) {
			return
		}

		const observer = new ResizeObserver(() => {
			if (!shouldStickToBottomRef.current) {
				return
			}

			scrollMessagesToBottom()
		})

		observer.observe(content)

		return () => {
			observer.disconnect()
		}
	}, [conversation.id])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!emojiPickerRef.current) {
				return
			}

			if (!emojiPickerRef.current.contains(event.target as Node)) {
				setIsEmojiOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	useEffect(() => {
		setInviteValue('')
		setInviteError(null)
		setRoomNameInput(conversation.name)
		setRoomDescriptionInput(conversation.description ?? '')
		setRoomSettingsError(null)
	}, [conversation.id])

	useEffect(() => {
		if (!isCurrentUserAdmin) {
			setRightPanelMode((previous) => (previous === 'settings' ? null : previous))
		}
	}, [isCurrentUserAdmin])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		if (rightPanelMode) {
			window.localStorage.setItem(RIGHT_PANEL_MODE_STORAGE_KEY, rightPanelMode)
			return
		}

		window.localStorage.removeItem(RIGHT_PANEL_MODE_STORAGE_KEY)
	}, [rightPanelMode])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		window.localStorage.setItem(RIGHT_PANEL_WIDTH_STORAGE_KEY, String(rightPanelWidth))
	}, [rightPanelWidth])

	useEffect(() => {
		if (!isResizingRightPanel) {
			return
		}

		const minWidth = 320
		const maxWidth = 560

		const handleMouseMove = (event: MouseEvent) => {
			if (!layoutRef.current) {
				return
			}

			const bounds = layoutRef.current.getBoundingClientRect()
			const nextWidth = bounds.right - event.clientX
			const clamped = Math.max(minWidth, Math.min(maxWidth, nextWidth))
			setRightPanelWidth(clamped)
		}

		const handleMouseUp = () => {
			setIsResizingRightPanel(false)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isResizingRightPanel])

	const sendMessage = () => {
		if (isSendDisabled) {
			return
		}

		const cleaned = draft.trim()
		if (!cleaned) {
			return
		}

		onSendMessage(conversation.id, cleaned)
		setDraft('')
	}

	const onSubmit = (event: FormEvent) => {
		event.preventDefault()
		sendMessage()
	}

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			sendMessage()
		}
	}

	const onSelectEmoji = (emoji: string) => {
		setDraft((prev) => `${prev}${emoji}`)
		setIsEmojiOpen(false)
	}

	const onSelectMedia = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || isSendDisabled || !onUploadMedia) {
			return
		}

		await onUploadMedia(conversation.id, file, draft)
		setDraft('')
		event.target.value = ''
	}

	const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!onAddUsersToRoom) {
			return
		}

		const parsedIds = inviteValue
			.split(',')
			.map((value) => Number(value.trim()))
			.filter((value) => Number.isInteger(value) && value > 0)

		if (parsedIds.length === 0) {
			setInviteError('Enter one or more numeric user IDs separated by commas.')
			return
		}

		setInviteError(null)
		setIsInviting(true)

		try {
			await onAddUsersToRoom(conversation.id, Array.from(new Set(parsedIds)))
			setInviteValue('')
		} catch (error) {
			setInviteError(error instanceof Error ? error.message : 'Failed to add users to the room.')
		} finally {
			setIsInviting(false)
		}
	}

	const handleUpdateRoomSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!onUpdateRoomDetails) {
			return
		}

		const nextName = roomNameInput.trim()
		const nextDescription = roomDescriptionInput.trim()

		if (!nextName) {
			setRoomSettingsError('Room name cannot be empty.')
			return
		}

		setRoomSettingsError(null)
		setIsUpdatingRoom(true)

		try {
			await onUpdateRoomDetails(conversation.id, {
				name: nextName,
				description: nextDescription,
			})
		} catch (error) {
			setRoomSettingsError(error instanceof Error ? error.message : 'Failed to update room settings.')
		} finally {
			setIsUpdatingRoom(false)
		}
	}

	const handleRemoveMember = async (memberId: number) => {
		if (!onRemoveMembersFromRoom) {
			return
		}

		setRoomSettingsError(null)
		setRemovingMemberId(memberId)

		try {
			await onRemoveMembersFromRoom(conversation.id, [memberId])
		} catch (error) {
			setRoomSettingsError(error instanceof Error ? error.message : 'Failed to remove member.')
		} finally {
			setRemovingMemberId(null)
		}
	}

	return (
		<section ref={layoutRef} className="motion-enter motion-stagger-2 flex min-w-0 flex-1 bg-[var(--bg-surface)]">
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3 sm:px-5 lg:px-6">
					<div className="flex items-center gap-3">
						<div className={`h-11 w-11 overflow-hidden rounded-full text-center text-[15px] leading-[2.75rem] font-semibold text-white ${conversation.isGroup ? 'bg-[var(--avatar-group-bg)]' : 'bg-[var(--bubble-sent)]'}`}>
							{conversation.avatar}
						</div>
						<div>
							<h2 className="max-w-[46vw] truncate text-[15px] font-semibold tracking-tight text-[var(--text-primary)] sm:max-w-none sm:text-[17px]">{conversation.name}</h2>
							<p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{conversation.subtitle}</p>
						</div>
					</div>

					<div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
						<nav className="hidden items-center gap-3 text-sm md:flex lg:gap-4">
							<button className="motion-interactive rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 font-semibold text-[var(--accent)]">Messages</button>
							<button className="motion-interactive pb-1 font-medium text-[var(--text-secondary)]">Shared Files</button>
						</nav>
						<div className="flex items-center gap-1 text-[var(--text-secondary)] sm:gap-2">
							{isCurrentUserAdmin && (
								<button
									type="button"
									onClick={() => setRightPanelMode((previous) => (previous === 'settings' ? null : 'settings'))}
									className={`motion-interactive rounded-lg p-2 hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] ${rightPanelMode === 'settings' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
									aria-label="manage room settings"
								>
									<Users size={18} />
								</button>
							)}
							<button className="motion-interactive rounded-lg p-2 hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]" aria-label="search in conversation">
								<Search size={18} />
							</button>
							<button
								type="button"
								onClick={() => setRightPanelMode((previous) => (previous === 'info' ? null : 'info'))}
								className={`motion-interactive rounded-lg p-2 hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] ${rightPanelMode === 'info' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
								aria-label="conversation info"
							>
								<CircleEllipsis size={18} />
							</button>
						</div>
					</div>
				</header>

				<div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
				<div ref={messagesContentRef}>
					<div className="mb-7 flex items-center gap-3">
						<div className="h-px flex-1 bg-[var(--border)]" />
						<span className="text-xs font-medium tracking-[0.1em] text-[var(--text-muted)]">OCTOBER 24, 2023</span>
						<div className="h-px flex-1 bg-[var(--border)]" />
					</div>

					<div>
						{messages.map((message, index) => (
							<ChatMessage
								key={message.id}
								message={message}
								isGroupedWithPrevious={isGroupedWith(messages[index - 1], message)}
								isGroupedWithNext={isGroupedWith(message, messages[index + 1])}
							/>
						))}
					</div>
				</div>
				</div>

				<form onSubmit={onSubmit} className="border-t border-[var(--border)] bg-[var(--bg-surface)] px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
					<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-2 shadow-sm">
						<div className="flex items-center gap-1">
							<button type="button" className="motion-interactive inline-flex min-h-11 items-center rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--accent)]" aria-label="add">
								<Plus size={18} />
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*,video/*"
								className="hidden"
								onChange={onSelectMedia}
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isSendDisabled || !onUploadMedia}
								className="motion-interactive inline-flex min-h-11 items-center rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
								aria-label="upload image or video"
							>
								<ImageIcon size={18} />
							</button>

							<textarea
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								onKeyDown={onKeyDown}
								disabled={isSendDisabled}
								rows={1}
								placeholder={`Type your message to ${conversation.name}…`}
								className="motion-focus min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
							/>

							<div ref={emojiPickerRef} className="relative">
								<button
									type="button"
									onClick={() => setIsEmojiOpen((prev) => !prev)}
									className="motion-interactive inline-flex min-h-11 items-center rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--accent)]"
									aria-label="emoji"
								>
									<Smile size={18} />
								</button>
								{isEmojiOpen && (
									<div className="motion-popover absolute bottom-12 right-0 z-20 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-lg">
										<div className="grid grid-cols-4 gap-1">
											{emojiOptions.map((emoji) => (
												<button
													key={emoji}
													type="button"
													onClick={() => onSelectEmoji(emoji)}
													className="motion-interactive rounded-lg p-2 text-lg hover:bg-[var(--bg-soft)]"
													aria-label={`insert ${emoji}`}
												>
													{emoji}
												</button>
											))}
										</div>
									</div>
								)}
							</div>
							<button
								type="submit"
								disabled={isSendDisabled}
								className="motion-interactive inline-flex min-h-11 items-center rounded-xl bg-[var(--accent)] p-2 text-[var(--bg-page)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
								aria-label="send message"
							>
								<SendHorizontal size={17} />
							</button>
						</div>
					</div>
					<p className="mt-2 text-right text-xs text-[var(--text-muted)]">
						{isSendDisabled ? 'Disconnected. Reconnecting…' : 'Press Enter to send or attach image/video'}
					</p>
				</form>
			</div>

			{isRightPanelOpen && (
				<aside
					className="relative hidden shrink-0 border-l border-[var(--border)] bg-[var(--bg-surface-alt)] xl:flex xl:flex-col"
					style={{ width: `${rightPanelWidth}px` }}
				>
					<div
						className="absolute left-0 top-0 h-full w-1 -translate-x-1/2 cursor-col-resize"
						onMouseDown={(event) => {
							event.preventDefault()
							setIsResizingRightPanel(true)
						}}
					/>

					{rightPanelMode === 'info' && (
						<>
							<div className="border-b border-[var(--border)] px-5 py-4">
								<h3 className="text-sm font-semibold text-[var(--text-primary)]">Conversation Info</h3>
								<p className="mt-1 text-xs text-[var(--text-muted)]">Visible to everyone in this conversation.</p>
							</div>

							<div className="flex-1 overflow-y-auto p-4">
								<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
									<h4 className="text-sm font-semibold text-[var(--text-primary)]">Details</h4>
									<div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
										<p><span className="font-medium text-[var(--text-primary)]">Name:</span> {conversation.name}</p>
										<p><span className="font-medium text-[var(--text-primary)]">Type:</span> {conversation.isGroup ? 'Group' : 'Direct'}</p>
										<p><span className="font-medium text-[var(--text-primary)]">Participants:</span> {roomMembers.length}</p>
										{conversation.description ? <p><span className="font-medium text-[var(--text-primary)]">Description:</span> {conversation.description}</p> : null}
									</div>
								</div>

								<div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<h4 className="text-sm font-semibold text-[var(--text-primary)]">Participants</h4>
										<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{roomMembers.length}</span>
									</div>
									{isRoomMembersLoading ? (
										<p className="text-sm text-[var(--text-secondary)]">Loading room members…</p>
									) : roomMembers.length > 0 ? (
										<div className="space-y-2">
											{roomMembers.map((member) => (
												<div key={member.roomMemberId} className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-2">
													<div className="flex items-center justify-between gap-2">
														<div className="flex min-w-0 items-center gap-2.5">
															<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--avatar-neutral-bg)] text-[10px] font-semibold text-white">
																U{member.userId}
															</div>
															<p className="truncate text-sm font-semibold text-[var(--text-primary)]">User #{member.userId}</p>
														</div>
														{member.roomRole.toUpperCase() === 'ADMIN' ? (
															<span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
																{member.roomRole}
															</span>
														) : null}
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-[var(--text-secondary)]">No members were returned for this room.</p>
									)}
									{roomMembersStatus && <p className="mt-3 text-sm text-[var(--text-secondary)]">{roomMembersStatus}</p>}
								</div>
							</div>
						</>
					)}

					{rightPanelMode === 'settings' && isCurrentUserAdmin && (
						<>
							<div className="border-b border-[var(--border)] px-5 py-4">
								<h3 className="text-sm font-semibold text-[var(--text-primary)]">Room Settings</h3>
								<p className="mt-1 text-xs text-[var(--text-muted)]">Modify room name, description, and members.</p>
							</div>

							<div className="flex-1 overflow-y-auto p-4">
								<form onSubmit={handleUpdateRoomSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
									<h4 className="text-sm font-semibold text-[var(--text-primary)]">Update Group Details</h4>
									<label className="mt-3 block text-xs font-medium text-[var(--text-secondary)]">
										Name
										<input
											type="text"
											value={roomNameInput}
											onChange={(event) => setRoomNameInput(event.target.value)}
											className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
										/>
									</label>
									<label className="mt-3 block text-xs font-medium text-[var(--text-secondary)]">
										Description
										<input
											type="text"
											value={roomDescriptionInput}
											onChange={(event) => setRoomDescriptionInput(event.target.value)}
											placeholder="Optional description"
											className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
										/>
									</label>
									<div className="mt-4 flex justify-end">
										<button
											type="submit"
											disabled={isUpdatingRoom}
											className="motion-interactive rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
										>
											{isUpdatingRoom ? 'Updating…' : 'Update Room'}
										</button>
									</div>
								</form>

								<div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<div>
											<h4 className="text-sm font-semibold text-[var(--text-primary)]">Current Members</h4>
											<p className="text-xs text-[var(--text-muted)]">Loaded from the backend.</p>
										</div>
										<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{roomMembers.length}</span>
									</div>

									{isRoomMembersLoading ? (
										<p className="text-sm text-[var(--text-secondary)]">Loading room members…</p>
									) : roomMembers.length > 0 ? (
										<div className="space-y-2">
											{roomMembers.map((member) => (
												<div key={member.roomMemberId} className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-2">
													<div className="flex items-center justify-between gap-2">
														<div className="flex min-w-0 items-center gap-2.5">
															<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--avatar-neutral-bg)] text-[10px] font-semibold text-white">
																U{member.userId}
															</div>
															<div className="min-w-0">
																<p className="truncate text-sm font-semibold text-[var(--text-primary)]">User #{member.userId}</p>
																{member.roomRole.toUpperCase() === 'ADMIN' ? (
																	<span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
																		{member.roomRole}
																	</span>
																) : null}
															</div>
														</div>
														{member.roomRole.toUpperCase() !== 'ADMIN' && (
															<button
																type="button"
																onClick={() => void handleRemoveMember(member.roomMemberId)}
																disabled={removingMemberId === member.roomMemberId}
																className="motion-interactive rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
															>
																{removingMemberId === member.roomMemberId ? 'Removing…' : 'Remove'}
															</button>
														)}
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-[var(--text-secondary)]">No members were returned for this room.</p>
									)}
								</div>

								<form onSubmit={handleInviteSubmit} className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
									<div className="mb-3 flex items-center gap-2">
										<div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
											<UserPlus size={16} />
										</div>
										<div>
											<h4 className="text-sm font-semibold text-[var(--text-primary)]">Add Users</h4>
											<p className="text-xs text-[var(--text-muted)]">Add users by backend user ID.</p>
										</div>
									</div>
									<label className="block text-xs font-medium text-[var(--text-secondary)]">
										User IDs
										<input
											type="text"
											value={inviteValue}
											onChange={(event) => setInviteValue(event.target.value)}
											placeholder="Example: 2, 3, 14"
											className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
										/>
									</label>
									<p className="mt-2 text-xs text-[var(--text-muted)]">Add one or more backend user IDs separated by commas.</p>
									{inviteError && <p className="mt-3 text-sm text-red-500">{inviteError}</p>}
									{roomSettingsError && <p className="mt-3 text-sm text-red-500">{roomSettingsError}</p>}
									{roomMembersStatus && <p className="mt-3 text-sm text-[var(--text-secondary)]">{roomMembersStatus}</p>}
									<div className="mt-4 flex justify-end">
										<button
											type="submit"
											disabled={isInviting}
											className="motion-interactive rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
										>
											{isInviting ? 'Adding…' : 'Add To Room'}
										</button>
									</div>
								</form>
							</div>
						</>
					)}
				</aside>
			)}
		</section>
	)
}
