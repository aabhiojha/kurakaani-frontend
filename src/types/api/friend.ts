export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type FriendshipResponse = {
	id: number
	requesterId: number
	recipientId: number
	status: FriendshipStatus
	createdAt: string
	updatedAt: string
}

export type FriendUserResponse = {
	userId: number
	username: string
	profilePicUrl: string | null
}
