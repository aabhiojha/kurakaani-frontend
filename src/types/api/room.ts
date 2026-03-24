export type RoomType = 'GROUP' | 'DIRECT' | 'DM'

export type RoomMemberResponse = {
	roomMemberId: number
	roomId: number
	userId: number
	roomRole: string
	joinedAt: string
}

export type RoomMessageResponse = {
	id: number
	roomId: number
	content: string
	isEdited: boolean
	isDeleted: boolean
	createdAt: string
	updatedAt: string
	userInfo: {
		id: number
		username: string
		profileImageUrl?: string
	}
}

export type RecentMessageResponse = {
	id: number
	roomId: number
	content: string
	sentAt: string
	sender: {
		id: number
		username: string
	}
}

export type RoomSummaryResponse = {
	id: number
	name: string
	description: string
	type: RoomType
	memberCount: number
	recentMessage: RecentMessageResponse | null
	unreadCount: number
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
