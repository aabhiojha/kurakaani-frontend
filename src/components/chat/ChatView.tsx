import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { CircleEllipsis, Image as ImageIcon, Plus, Search, Smile, SquareArrowOutUpRight } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import type { Conversation, Message } from '../../types/chat'

type ChatViewProps = {
	conversation: Conversation
	messages: Message[]
	onSendMessage: (conversationId: number, text: string) => void
}

export function ChatView({ conversation, messages, onSendMessage }: ChatViewProps) {
	const [draft, setDraft] = useState('')

	const sendMessage = () => {
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

	return (
		<section className="flex min-w-0 flex-1 flex-col bg-white">
			<header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
				<div className="flex items-center gap-3">
					<div className={`h-11 w-11 overflow-hidden rounded-full text-center text-[15px] leading-[2.75rem] font-semibold text-white ${conversation.isGroup ? 'bg-teal-600' : 'bg-[#1A2B5E]'}`}>
						{conversation.avatar}
					</div>
					<div>
						<h2 className="text-base font-semibold text-slate-900">{conversation.name}</h2>
						<p className="text-xs tracking-wide text-slate-500">{conversation.subtitle}</p>
					</div>
				</div>

				<div className="flex items-center gap-6">
					<nav className="flex items-center gap-4 text-sm">
						<button className="border-b-2 border-[#1A2B5E] pb-1 font-semibold text-[#1A2B5E]">Messages</button>
						<button className="pb-1 font-medium text-slate-500">Shared Files</button>
						<button className="pb-1 font-medium text-slate-500">Pinned</button>
					</nav>
					<div className="flex items-center gap-2 text-slate-500">
						<button className="rounded-lg p-2 transition hover:bg-slate-50 hover:text-slate-700" aria-label="search in conversation">
							<Search size={18} />
						</button>
						<button className="rounded-lg p-2 transition hover:bg-slate-50 hover:text-slate-700" aria-label="more options">
							<CircleEllipsis size={18} />
						</button>
					</div>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto bg-[#FAFAF7] px-8 py-6">
				<div className="mb-7 flex items-center gap-3">
					<div className="h-px flex-1 bg-slate-200" />
					<span className="text-xs font-medium tracking-[0.1em] text-slate-400">OCTOBER 24, 2023</span>
					<div className="h-px flex-1 bg-slate-200" />
				</div>

				<div className="space-y-4">
					{messages.map((message) => (
						<ChatMessage key={message.id} message={message} />
					))}
				</div>
			</div>

			<form onSubmit={onSubmit} className="border-t border-slate-200 bg-white px-6 py-4">
				<div className="rounded-2xl border border-slate-200 bg-[#F5F5F0] p-2 shadow-sm">
					<div className="flex items-center gap-1">
						<button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-[#1A2B5E]" aria-label="add">
							<Plus size={18} />
						</button>
						<button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-[#1A2B5E]" aria-label="upload image">
							<ImageIcon size={18} />
						</button>

						<textarea
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={onKeyDown}
							rows={1}
							placeholder={`Type your message to ${conversation.name}…`}
							className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
						/>

						<button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-[#1A2B5E]" aria-label="emoji">
							<Smile size={18} />
						</button>
						<button
							type="submit"
							className="rounded-xl bg-[#1A2B5E] p-2 text-white shadow-[0_8px_18px_rgba(26,43,94,0.28)] transition hover:bg-[#13214a]"
							aria-label="send message"
						>
							<SquareArrowOutUpRight size={17} />
						</button>
					</div>
				</div>
				<p className="mt-2 text-right text-xs text-slate-400">Press Enter to send</p>
			</form>
		</section>
	)
}
