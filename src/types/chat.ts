export type ChatSection = 'direct' | 'groups'

export type Message = {
	id: number
	isSent: boolean
	senderName: string
	senderAvatar: string
	senderProfileImageUrl?: string
	senderId?: number
	text: string
	timestamp: string
	messageType?: 'TEXT' | 'IMAGE' | 'VIDEO'
	mediaUrl?: string
	mediaContentType?: string
	mediaFileName?: string
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
