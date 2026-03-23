import { apiFetch } from '../lib/api'
import type { RoomResponse } from '../types/api/room'

export type CreateRoomRequest = {
	name: string
	description: string
	type: 'DIRECT' | 'GROUP'
}

export const createRoom = (payload: CreateRoomRequest) => apiFetch('/api/rooms', {
	method: 'POST',
	body: JSON.stringify(payload),
})

export const getRooms = () => apiFetch<RoomResponse[]>('/api/rooms')

export const getRoomMembers = (roomId: number) => apiFetch(`/api/rooms/room/${roomId}`)

export const addUsersToRoom = (roomId: number, userIds: number[]) =>
	apiFetch(`/api/rooms/room/${roomId}/add`, {
		method: 'POST',
		body: JSON.stringify({ userIds }),
	})
