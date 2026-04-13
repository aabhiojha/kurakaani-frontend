import { useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, Loader2, RotateCcw } from 'lucide-react'
import { resolveAssetUrl } from '../../lib/config'
import type { Message } from '../../types/chat'

type ChatMessageProps = {
	message: Message
	isGroupedWithPrevious: boolean
	isGroupedWithNext: boolean
	onRetry?: (messageId: number) => void
}

export function ChatMessage({ message, isGroupedWithPrevious, isGroupedWithNext, onRetry }: ChatMessageProps) {
	const [isMetaVisible, setIsMetaVisible] = useState(false)
	const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
	const messageMetaRef = useRef<HTMLDivElement | null>(null)
	const isSystemMessage = message.senderName === 'System'
	const isRight = message.isSent
	const mediaUrl = resolveAssetUrl(message.mediaUrl)
	const senderAvatarUrl = resolveAssetUrl(message.senderProfileImageUrl)
	const avatarTopSpacingClass = isGroupedWithPrevious ? 'mt-0' : 'mt-4'
	const bubbleStateClass =
		message.deliveryState === 'pending' ? 'opacity-75' : message.deliveryState === 'failed' ? 'opacity-80' : 'opacity-100'
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
		<>
			<div className={`motion-enter-soft flex ${isRight ? 'justify-end' : 'justify-start'} ${isGroupedWithPrevious ? 'mt-0.5' : 'mt-2.5'}`}>
				<div className={`flex max-w-[80%] items-start gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
					{isGroupedWithNext ? (
						<div className="h-8 w-8 shrink-0" />
					) : (
						<div
							className={`${avatarTopSpacingClass} flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] text-[11px] font-semibold text-white ${
								isRight ? 'bg-[var(--bubble-sent)]' : 'bg-[var(--avatar-neutral-bg)]'
							}`}
						>
							{senderAvatarUrl ? (
								<img
									src={senderAvatarUrl}
									alt={`${message.senderName} avatar`}
									className="h-full w-full object-cover"
								/>
							) : (
								message.senderAvatar
							)}
						</div>
					)}
					<div className={`${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
						{!isGroupedWithPrevious && <span className="mb-0.5 px-1 text-xs font-medium text-[var(--text-secondary)]">{message.senderName}</span>}
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
								className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${bubbleStateClass} ${
									isRight
										? 'rounded-br-sm bg-[var(--bubble-sent)] text-white'
										: 'rounded-bl-sm bg-[var(--bubble-received)] text-[var(--text-primary)]'
								}`}
							>
								{message.text ? <p>{message.text}</p> : null}
								{mediaUrl && message.messageType === 'IMAGE' && (
									<div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
										<button
											type="button"
											onClick={(event) => {
												event.stopPropagation()
												setIsImagePreviewOpen(true)
											}}
											className="block w-full"
											aria-label="open image preview"
										>
											<img
												src={mediaUrl}
												alt={message.mediaFileName ?? 'Shared image'}
												className="max-h-80 w-full rounded-lg object-cover transition-transform duration-200 hover:scale-[1.01]"
											/>
										</button>
									</div>
								)}
								{mediaUrl && message.messageType === 'VIDEO' && (
									<div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
										<video
											src={mediaUrl}
											controls
											className="max-h-80 w-full rounded-lg"
										/>
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
							<div className="mt-0.5 flex items-center gap-1 px-1 text-xs text-[var(--text-muted)]">
								<button
									type="button"
									onClick={() => setIsMetaVisible((previous) => !previous)}
									className="text-xs text-[var(--text-muted)]"
								>
									{message.timestamp}
								</button>
								{isRight && message.deliveryState === 'pending' && <Loader2 size={11} className="animate-spin" />}
								{isRight && message.deliveryState === 'sent' && <Check size={11} />}
								{isRight && message.deliveryState === 'delivered' && <CheckCheck size={11} />}
								{isRight && message.deliveryState === 'read' && <CheckCheck size={11} className="text-[var(--accent)]" />}
								{isRight && message.deliveryState === 'failed' && (
									<button
										type="button"
										onClick={() => onRetry?.(message.id)}
										className="inline-flex items-center gap-1 text-[11px] text-red-500"
									>
										<RotateCcw size={10} />
										failed — retry
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
			{isImagePreviewOpen && mediaUrl && message.messageType === 'IMAGE' && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
					onClick={() => setIsImagePreviewOpen(false)}
				>
					<div className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2 shadow-2xl">
						<img
							src={mediaUrl}
							alt={message.mediaFileName ?? 'Shared image'}
							className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
						/>
					</div>
				</div>
			)}
		</>
	)
}
