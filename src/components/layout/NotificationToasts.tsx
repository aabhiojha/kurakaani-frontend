import { Bell, MessageSquareMore, UserPlus, Users, X } from 'lucide-react'

export type NotificationToastType = 'FRIEND_REQUEST' | 'DM' | 'ROOM'

export type NotificationToast = {
	id: string
	type: NotificationToastType
	title: string
	body: string
	createdAt: number
}

type NotificationToastsProps = {
	notifications: NotificationToast[]
	onDismiss: (id: string) => void
}

const getToastIcon = (type: NotificationToastType) => {
	switch (type) {
		case 'FRIEND_REQUEST':
			return <UserPlus size={14} />
		case 'DM':
			return <MessageSquareMore size={14} />
		case 'ROOM':
			return <Users size={14} />
		default:
			return <Bell size={14} />
	}
}

const getToastAccentClass = (type: NotificationToastType) => {
	switch (type) {
		case 'FRIEND_REQUEST':
			return 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
		case 'DM':
			return 'border-[var(--bubble-sent)] bg-[var(--bg-soft)] text-[var(--bubble-sent)]'
		case 'ROOM':
			return 'border-[var(--avatar-group-bg)] bg-[var(--bg-soft)] text-[var(--avatar-group-bg)]'
		default:
			return 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
	}
}

const formatTime = (createdAt: number) =>
	new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function NotificationToasts({ notifications, onDismiss }: NotificationToastsProps) {
	if (notifications.length === 0) {
		return null
	}

	return (
		<div
			className="pointer-events-none fixed right-3 top-3 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2 sm:right-4 sm:top-4"
			aria-live="polite"
			aria-relevant="additions removals"
		>
			{notifications.map((notification) => (
				<article
					key={notification.id}
					className="motion-enter-soft pointer-events-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
					role="status"
				>
					<div className="h-1 w-full bg-[var(--accent)] opacity-80" aria-hidden="true" />
					<div className="flex items-start gap-3 p-3.5">
						<div
							className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${getToastAccentClass(notification.type)}`}
							aria-hidden="true"
						>
							{getToastIcon(notification.type)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-[var(--text-primary)]">
										{notification.title}
									</p>
									<p className="mt-0.5 text-sm leading-5 text-[var(--text-secondary)]">
										{notification.body}
									</p>
								</div>
								<button
									type="button"
									onClick={() => onDismiss(notification.id)}
									className="motion-interactive -mr-1 -mt-1 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
									aria-label="dismiss notification"
								>
									<X size={14} />
								</button>
							</div>
							<div className="mt-2 flex items-center justify-between gap-2">
								<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getToastAccentClass(notification.type)}`}>
									{notification.type === 'FRIEND_REQUEST' ? 'Friend' : notification.type === 'DM' ? 'Direct' : 'Room'}
								</span>
								<span className="text-[11px] text-[var(--text-muted)]">{formatTime(notification.createdAt)}</span>
							</div>
						</div>
					</div>
				</article>
			))}
		</div>
	)
}
