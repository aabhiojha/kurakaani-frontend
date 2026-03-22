export type MessageSide = 'left' | 'right'

export type ChatSection = 'direct' | 'groups'

export type Message = {
	id: number
	side: MessageSide
	senderName: string
	senderAvatar: string
	text: string
	timestamp: string
	withImage?: boolean
}

export type Conversation = {
	id: number
	section: ChatSection
	name: string
	subtitle: string
	time: string
	preview: string
	avatar: string
	isGroup: boolean
	online?: boolean
}
