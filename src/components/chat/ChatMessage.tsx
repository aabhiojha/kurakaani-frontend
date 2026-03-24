import { useEffect, useRef, useState } from 'react'
import type { Message } from '../../types/chat'

type ChatMessageProps = {
	message: Message
	isGroupedWithPrevious: boolean
	isGroupedWithNext: boolean
}

export function ChatMessage({ message, isGroupedWithPrevious, isGroupedWithNext }: ChatMessageProps) {
	const [isMetaVisible, setIsMetaVisible] = useState(false)
	const messageMetaRef = useRef<HTMLDivElement | null>(null)
	const isSystemMessage = message.senderName === 'System'
	const isRight = message.isSent

	useEffect(() => {
		if (!isMetaVisible) {
			return
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (!messageMetaRef.current) {
				return
			}

			if (!messageMetaRef.current.contains(event.target as Node)) {
				setIsMetaVisible(false)
			}
		}

		document.addEventListener('pointerdown', handlePointerDown)
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown)
		}
	}, [isMetaVisible])

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
							isRight ? 'bg-[var(--bubble-sent)]' : 'bg-[var(--avatar-neutral-bg)]'
						}`}
					>
						{message.senderAvatar}
					</div>
				)}
				<div className={`${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
					{!isGroupedWithPrevious && <span className="mb-1 px-1 text-xs font-medium text-[var(--text-secondary)]">{message.senderName}</span>}
					<div ref={messageMetaRef} className="group relative">
						<div
							onClick={() => setIsMetaVisible((previous) => !previous)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault()
									setIsMetaVisible((previous) => !previous)
								}
							}}
							role="button"
							tabIndex={0}
							className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
								isRight
									? 'rounded-br-sm bg-[var(--bubble-sent)] text-white'
									: 'rounded-bl-sm bg-[var(--bubble-received)] text-[var(--text-primary)]'
							}`}
						>
							<p>{message.text}</p>
							{message.withImage && (
								<div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
									<div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-muted)]">
										Image attachment preview
									</div>
								</div>
							)}
						</div>
						<div
							className={`pointer-events-none absolute -top-8 z-10 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-secondary)] shadow-sm transition-opacity duration-200 ease-out ${
								isMetaVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
							} ${
								isRight ? 'right-0' : 'left-0'
							}`}
						>
							{message.senderName} • {message.timestamp}
						</div>
					</div>
					{!isGroupedWithNext && (
						<button
							type="button"
							onClick={() => setIsMetaVisible((previous) => !previous)}
							className="mt-1 px-1 text-xs text-[var(--text-muted)]"
						>
							{message.timestamp}
						</button>
					)}
				</div>
			</div>
		</div>
	)
}
