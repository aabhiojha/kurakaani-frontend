import type { Message } from '../../types/chat'

type ChatMessageProps = {
	message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
	const isRight = message.side === 'right'

	return (
		<div className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
			<div className={`flex max-w-[80%] items-start gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
				<div
					className={`mt-5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white ${
						isRight ? 'bg-[#1A2B5E]' : 'bg-slate-500'
					}`}
				>
					{message.senderAvatar}
				</div>
				<div className={`${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
					<span className="mb-1 px-1 text-xs font-medium text-slate-500">{message.senderName}</span>
				<div
					className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
						isRight
							? 'rounded-br-sm bg-[#1A2B5E] text-white'
							: 'rounded-bl-sm bg-[#ECEFF3] text-slate-700'
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
					<span className="mt-1 px-1 text-xs text-slate-400">{message.timestamp}</span>
				</div>
			</div>
		</div>
	)
}
