import type { Message } from '../../types/chat'

type ChatMessageProps = {
	message: Message
	isGroupedWithPrevious: boolean
	isGroupedWithNext: boolean
}

export function ChatMessage({ message, isGroupedWithPrevious, isGroupedWithNext }: ChatMessageProps) {
	const isSystemMessage = message.senderName === 'System'
	const isRight = message.side === 'right'

	if (isSystemMessage) {
		return (
			<div className="motion-enter-soft mt-4 flex justify-center">
				<div className="flex flex-col items-center">
					<div className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
						{message.text}
					</div>
					<span className="mt-1 text-[11px] text-[var(--text-muted)]">{message.timestamp}</span>
				</div>
			</div>
		)
	}

	return (
		<div className={`motion-enter-soft flex ${isRight ? 'justify-end' : 'justify-start'} ${isGroupedWithPrevious ? 'mt-1' : 'mt-4'}`}>
			<div className={`flex max-w-[80%] items-start gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
				{isGroupedWithNext ? (
					<div className="h-8 w-8 shrink-0" />
				) : (
					<div
						className={`mt-5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white ${
							isRight ? 'bg-[var(--bubble-sent)]' : 'bg-[#505050]'
						}`}
					>
						{message.senderAvatar}
					</div>
				)}
				<div className={`${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
					{!isGroupedWithPrevious && <span className="mb-1 px-1 text-xs font-medium text-[var(--text-secondary)]">{message.senderName}</span>}
					<div className="group relative">
						<div
							className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
								isRight
									? 'rounded-br-sm bg-[var(--bubble-sent)] text-white'
									: 'rounded-bl-sm bg-[var(--bubble-received)] text-[var(--text-primary)]'
							}`}
						>
							<p>{message.text}</p>
							{message.withImage && (
								<div className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-teal-900 to-slate-900 p-3 shadow-inner">
									<div className="relative h-36 overflow-hidden rounded-lg bg-gradient-to-br from-[#0d2c31] to-[#08151f]">
										<div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-teal-400/20 blur-2xl" />
										<div className="absolute -bottom-8 right-1 h-28 w-28 rounded-full bg-cyan-400/15 blur-2xl" />
										<div className="absolute left-1/2 top-1/2 h-24 w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md" />
									</div>
								</div>
							)}
						</div>
						<div
							className={`pointer-events-none absolute -top-8 z-10 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-secondary)] opacity-0 shadow-sm transition-opacity duration-200 ease-out group-hover:opacity-100 ${
								isRight ? 'right-0' : 'left-0'
							}`}
						>
							{message.senderName} • {message.timestamp}
						</div>
					</div>
					{!isGroupedWithNext && <span className="mt-1 px-1 text-xs text-[var(--text-muted)]">{message.timestamp}</span>}
				</div>
			</div>
		</div>
	)
}
