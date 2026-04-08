import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { FriendshipResponse } from '../../types/api/friend'

type FriendRequestsPageProps = {
	friendships: {
		incoming: FriendshipResponse[]
		sent: FriendshipResponse[]
	}
	friendshipStatus: string | null
	isFriendshipsLoading: boolean
	onRespondToFriendRequest: (userId: number, response: 'ACCEPT' | 'REJECT') => Promise<void>
	onCancelFriendRequest: (userId: number) => Promise<void>
}

export function FriendRequestsPage({
	friendships,
	friendshipStatus,
	isFriendshipsLoading,
	onRespondToFriendRequest,
	onCancelFriendRequest,
}: FriendRequestsPageProps) {
	const [actionError, setActionError] = useState<string | null>(null)
	const [actionLoading, setActionLoading] = useState(false)

	const runAction = async (action: () => Promise<void>) => {
		setActionError(null)
		setActionLoading(true)

		try {
			await action()
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Request action failed.')
		} finally {
			setActionLoading(false)
		}
	}

	return (
		<section className="motion-enter flex min-w-0 flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] p-3 sm:p-4 lg:p-6">
			<div className="mx-auto w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6">
				<div className="mb-6 border-b border-[var(--border)] pb-4">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Friendships</p>
					<h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Friend Requests</h2>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">Manage incoming and sent friend requests.</p>
				</div>

				{actionError && <p className="mb-4 text-sm text-red-500">{actionError}</p>}
				{friendshipStatus && <p className="mb-4 text-sm text-[var(--text-secondary)]">{friendshipStatus}</p>}

				<div className="grid gap-4 xl:grid-cols-2">
					<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-sm font-semibold text-[var(--text-primary)]">Incoming</h3>
							<span className="rounded-full bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)]">{friendships.incoming.length}</span>
						</div>
						<div className="space-y-3">
							{friendships.incoming.map((friendship) => (
								<div key={friendship.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
									<p className="text-sm font-semibold text-[var(--text-primary)]">
										From {friendship.requesterName ?? `User #${friendship.requesterId}`}
									</p>
									<p className="mt-1 text-xs text-[var(--text-muted)]">Pending request</p>
									<div className="mt-3 flex gap-2">
										<button
											type="button"
											onClick={() => void runAction(() => onRespondToFriendRequest(friendship.requesterId, 'ACCEPT'))}
											disabled={actionLoading}
											className="motion-interactive rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--bg-page)] disabled:cursor-not-allowed disabled:opacity-70"
										>
											Accept
										</button>
										<button
											type="button"
											onClick={() => void runAction(() => onRespondToFriendRequest(friendship.requesterId, 'REJECT'))}
											disabled={actionLoading}
											className="motion-interactive rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
										>
											Reject
										</button>
									</div>
								</div>
							))}
							{isFriendshipsLoading && <p className="text-sm text-[var(--text-secondary)]">Loading incoming requests…</p>}
							{!isFriendshipsLoading && friendships.incoming.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No incoming requests.</p>}
						</div>
					</div>

					<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
						<div className="mb-3 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<UserPlus size={16} className="text-[var(--text-secondary)]" />
								<h3 className="text-sm font-semibold text-[var(--text-primary)]">Sent</h3>
							</div>
							<span className="rounded-full bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)]">{friendships.sent.length}</span>
						</div>
						<div className="space-y-3">
							{friendships.sent.map((friendship) => (
								<div key={friendship.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
									<p className="text-sm font-semibold text-[var(--text-primary)]">
										To {friendship.recipientName ?? `User #${friendship.recipientId}`}
									</p>
									<p className="mt-1 text-xs text-[var(--text-muted)]">Awaiting response</p>
									<div className="mt-3">
										<button
											type="button"
											onClick={() => void runAction(() => onCancelFriendRequest(friendship.recipientId))}
											disabled={actionLoading}
											className="motion-interactive rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
										>
											Cancel
										</button>
									</div>
								</div>
							))}
							{isFriendshipsLoading && <p className="text-sm text-[var(--text-secondary)]">Loading sent requests…</p>}
							{!isFriendshipsLoading && friendships.sent.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No sent requests.</p>}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
