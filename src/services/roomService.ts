import { apiFetch } from '../lib/api'
import type { RoomMessageResponse, RoomResponse, RoomSummaryResponse } from '../types/api/room'

export type CreateRoomRequest = {
	name: string
	description: string
	type: 'DIRECT' | 'GROUP'
}

export const createRoom = (payload: CreateRoomRequest) => apiFetch<RoomResponse>('/api/rooms', {
	method: 'POST',
	body: JSON.stringify(payload),
})

export const getRooms = () => apiFetch<RoomSummaryResponse[]>('/api/rooms')

export const getRoomMessages = (roomId: number) => apiFetch<RoomMessageResponse[]>(`/api/rooms/room/${roomId}/message`)

export const getRoomMembers = (roomId: number) => apiFetch(`/api/rooms/room/${roomId}`)

export const addUsersToRoom = (roomId: number, userIds: number[]) =>
	apiFetch(`/api/rooms/room/${roomId}/add`, {
		method: 'POST',
		body: JSON.stringify({ userIds }),
	})
