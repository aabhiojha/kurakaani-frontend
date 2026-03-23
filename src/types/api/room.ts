export type RoomType = 'GROUP' | 'DIRECT' | 'DM'

export type RoomMemberResponse = {
	roomMemberId: number
	roomId: number
	userId: number
	roomRole: string
	joinedAt: string
}

export type RoomMessageResponse = {
	id?: number
	content?: string
	senderId?: number
	userId?: number
	senderName?: string
	userName?: string
	username?: string
	sender?: {
		id?: number
		userName?: string
		username?: string
		name?: string
	}
	user?: {
		id?: number
		userName?: string
		username?: string
		name?: string
	}
	createdAt?: string
	[key: string]: unknown
}

export type RoomResponse = {
	id: number
	name: string
	description: string
	members: RoomMemberResponse[]
	messages: RoomMessageResponse[]
	type: RoomType
	createdById: number
	createdAt: string
	updatedAt: string
}
