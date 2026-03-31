import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { resolveAssetUrl } from '../../lib/config'
import { getUsers } from '../../services/userService'
import type { FriendUserResponse, FriendshipResponse } from '../../types/api/friend'
import type { UserSummaryResponse } from '../../types/api/user'

type FindPeoplePageProps = {
	currentUserId?: number
	friendships: {
		incoming: FriendshipResponse[]
		sent: FriendshipResponse[]
		friends: FriendUserResponse[]
	}
	onSendFriendRequest: (userId: number) => Promise<void>
}

const getAvatarLabel = (name?: string) => {
	const value = (name ?? '')
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('')

	return value || 'US'
}

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase()

export function FindPeoplePage({ currentUserId, friendships, onSendFriendRequest }: FindPeoplePageProps) {
	const [users, setUsers] = useState<UserSummaryResponse[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [actionError, setActionError] = useState<string | null>(null)
	const [sendingUserId, setSendingUserId] = useState<number | null>(null)

	useEffect(() => {
		let isDisposed = false

		const loadUsers = async () => {
			setIsLoading(true)
			setStatusMessage(null)

			try {
				const result = await getUsers()
				if (isDisposed) {
					return
				}

				setUsers(Array.isArray(result) ? result : [])
				setStatusMessage(Array.isArray(result) ? `Loaded ${result.length} users.` : 'No user data returned.')
			} catch (error) {
				if (isDisposed) {
					return
				}

				setUsers([])
				setStatusMessage(error instanceof Error ? error.message : 'Failed to load users.')
			} finally {
				if (!isDisposed) {
					setIsLoading(false)
				}
			}
		}

		void loadUsers()

		return () => {
			isDisposed = true
		}
	}, [])

	const pendingRecipientIds = useMemo(
		() => new Set(friendships.sent.filter((item) => item.status === 'PENDING').map((item) => item.recipientId)),
		[friendships.sent],
	)

	const incomingRequesterIds = useMemo(
		() => new Set(friendships.incoming.filter((item) => item.status === 'PENDING').map((item) => item.requesterId)),
		[friendships.incoming],
	)

	const friendUserIds = useMemo(
		() => new Set(friendships.friends.map((f) => f.userId)),
		[friendships.friends],
	)

	const filteredUsers = useMemo(() => {
		const query = normalize(searchTerm)

		return users
			.filter((user) => {
				if (typeof currentUserId === 'number' && currentUserId > 0 && user.id === currentUserId) {
					return false
				}

				if (!query) {
					return true
				}

				return normalize(user.userName).includes(query)
			})
			.sort((a, b) => a.userName.localeCompare(b.userName))
	}, [currentUserId, searchTerm, users])

	const resolveFriendshipState = (userId: number) => {
		if (friendUserIds.has(userId)) {
			return 'friend' as const
		}

		if (pendingRecipientIds.has(userId)) {
			return 'sent' as const
		}

		if (incomingRequesterIds.has(userId)) {
			return 'incoming' as const
		}

		return 'none' as const
	}

	const sendRequest = async (userId: number) => {
		setActionError(null)
		setSendingUserId(userId)

		try {
			await onSendFriendRequest(userId)
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Failed to send friend request.')
		} finally {
			setSendingUserId(null)
		}
	}

	return (
		<section className="motion-enter flex min-w-0 flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] p-2 sm:p-3 lg:p-4">
			<div className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-5">
				<div className="mb-3 border-b border-[var(--border)] pb-3">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Network</p>
					<h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--text-primary)]">Find People</h2>
					<p className="mt-1 text-xs text-[var(--text-secondary)]">Search users by username and send friend requests.</p>
				</div>

				<label className="relative block">
					<Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
					<input
						type="text"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Search by username..."
						className="motion-focus w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
					/>
				</label>

				<div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
					<span>{isLoading ? 'Loading users...' : `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} found`}</span>
					{statusMessage ? <span>{statusMessage}</span> : null}
				</div>

				{actionError && <p className="mt-3 text-sm text-red-500">{actionError}</p>}

				<div className="mt-3 space-y-1.5">
					{filteredUsers.map((user) => {
						const avatarUrl = resolveAssetUrl(user.profileImageUrl)
						const friendshipState = resolveFriendshipState(user.id)
						const isSending = sendingUserId === user.id

						return (
							<div key={user.id} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-2">
								<div className="flex min-w-0 items-center gap-2.5">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-[11px] font-semibold text-white">
										{avatarUrl ? <img src={avatarUrl} alt={user.userName} className="h-full w-full object-cover" /> : getAvatarLabel(user.userName)}
									</div>
									<div className="min-w-0">
										<p className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">{user.userName}</p>
										<p className="text-xs text-[var(--text-muted)]">User #{user.id}</p>
									</div>
								</div>

								{friendshipState === 'friend' ? (
									<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">Friends</span>
								) : friendshipState === 'sent' ? (
									<span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">Request Sent</span>
								) : friendshipState === 'incoming' ? (
									<span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">Incoming Request</span>
								) : (
									<button
										type="button"
										onClick={() => void sendRequest(user.id)}
										disabled={isSending}
										className="motion-interactive inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--bg-page)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
									>
										<UserPlus size={13} />
										{isSending ? 'Sending...' : 'Add Friend'}
									</button>
								)}
							</div>
						)
					})}
				</div>

				{!isLoading && filteredUsers.length === 0 && (
					<div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-6 text-center">
						<div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
							<Users size={16} />
						</div>
						<p className="text-sm font-medium text-[var(--text-primary)]">No users matched your search.</p>
						<p className="mt-1 text-xs text-[var(--text-secondary)]">Try a different username keyword.</p>
					</div>
				)}
			</div>
		</section>
	)
}
