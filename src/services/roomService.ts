import { apiFetch } from '../lib/api'
import type { RoomMemberResponse, RoomMessageResponse, RoomResponse, RoomSummaryResponse } from '../types/api/room'

export type CreateGroupRoomRequest = {
	name: string
	description: string
	type: 'GROUP'
}

export const createGroupRoom = (payload: CreateGroupRoomRequest) => apiFetch<RoomResponse>('/api/rooms/group', {
	method: 'POST',
	body: JSON.stringify(payload),
})

export const createOrGetDirectRoom = (userId: number) =>
	apiFetch<RoomResponse>(`/api/rooms/dm?userId=${encodeURIComponent(userId)}`, {
		method: 'POST',
	})

export const upgradeRoomToGroup = (roomId: number, userIds: number[]) =>
	apiFetch<RoomResponse>(`/api/rooms/room/${roomId}/group/create`, {
		method: 'POST',
		body: JSON.stringify({ userIds }),
	})

export const getRooms = () => apiFetch<RoomSummaryResponse[]>('/api/rooms')

export const getRoomMessages = (roomId: number) => apiFetch<RoomMessageResponse[]>(`/api/rooms/room/${roomId}/message`)

export const getRoomMembers = (roomId: number) => apiFetch<RoomMemberResponse[]>(`/api/rooms/room/${roomId}`)

export type UpdateGroupRoomRequest = {
	name?: string
	description?: string
	userId?: number[]
}

export const updateGroupRoom = (roomId: number, payload: UpdateGroupRoomRequest) =>
	apiFetch<RoomResponse>(`/api/rooms/room/${roomId}`, {
		method: 'POST',
		body: JSON.stringify(payload),
	})

export const addUsersToRoom = (roomId: number, userIds: number[]) =>
	updateGroupRoom(roomId, {
		userId: userIds,
	})

export const removeUsersFromRoom = (roomId: number, membersId: number[]) =>
	apiFetch<void>(`/api/rooms/room/${roomId}/remove`, {
		method: 'POST',
		body: JSON.stringify({ membersId }),
	})

export const uploadRoomMedia = (roomId: number, file: File, content?: string) => {
	const formData = new FormData()
	formData.append('file', file)

	if (content?.trim()) {
		formData.append('content', content.trim())
	}

	return apiFetch<RoomMessageResponse>(`/api/rooms/room/${roomId}/message/media`, {
		method: 'POST',
		body: formData,
	})
}
