import { apiFetch } from '../lib/api'
import type { RoomMemberResponse, RoomMessageResponse, RoomResponse, RoomSummaryResponse } from '../types/api/room'

export type CreateRoomRequest = {
	name: string
	description: string
	type: 'DM' | 'GROUP'
}

export const createRoom = (payload: CreateRoomRequest) => apiFetch<RoomResponse>('/api/rooms', {
	method: 'POST',
	body: JSON.stringify(payload),
})

export const getRooms = () => apiFetch<RoomSummaryResponse[]>('/api/rooms')

export const getRoomMessages = (roomId: number) => apiFetch<RoomMessageResponse[]>(`/api/rooms/room/${roomId}/message`)

export const getRoomMembers = (roomId: number) => apiFetch<RoomMemberResponse[]>(`/api/rooms/room/${roomId}`)

export const addUsersToRoom = (roomId: number, userIds: number[]) =>
	apiFetch<void>(`/api/rooms/room/${roomId}/add`, {
		method: 'POST',
		body: JSON.stringify({ userIds }),
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
