import { useState } from 'react'
import {
	cancelFriendRequest,
	getFriends,
	getIncomingFriendRequests,
	getSentFriendRequests,
	respondToFriendRequest,
	sendFriendRequest,
} from '../services/friendService'
import type { FriendUserResponse, FriendshipResponse } from '../types/api/friend'

export function useFriendships() {
	const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendshipResponse[]>([])
	const [sentFriendRequests, setSentFriendRequests] = useState<FriendshipResponse[]>([])
	const [friends, setFriends] = useState<FriendUserResponse[]>([])
	const [isFriendshipsLoading, setIsFriendshipsLoading] = useState(false)
	const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null)

	const loadFriendships = async () => {
		setIsFriendshipsLoading(true)
		try {
			const [incoming, sent, accepted] = await Promise.all([
				getIncomingFriendRequests(),
				getSentFriendRequests(),
				getFriends(),
			])
			setIncomingFriendRequests(incoming)
			setSentFriendRequests(sent)
			setFriends(accepted)
		} catch {
			setFriendshipStatus('Failed to load friendship data.')
		} finally {
			setIsFriendshipsLoading(false)
		}
	}

	const clearFriendships = () => {
		setIncomingFriendRequests([])
		setSentFriendRequests([])
		setFriends([])
		setFriendshipStatus(null)
	}

	// Called by useChatSocket when a friendship notification arrives over WebSocket.
	const handleFriendshipNotification = (
		type: string,
		payload: FriendshipResponse,
		currentUserId: number,
	) => {
		const upsert = (items: FriendshipResponse[], item: FriendshipResponse) => {
			const idx = items.findIndex((i) => i.id === item.id)
			if (idx >= 0) {
				const next = [...items]
				next[idx] = item
				return next
			}
			return [item, ...items]
		}

		const removeByParticipants = (items: FriendshipResponse[], item: FriendshipResponse) =>
			items.filter(
				(i) =>
					i.id !== item.id &&
					!(i.requesterId === item.requesterId && i.recipientId === item.recipientId),
			)

		switch (type) {
			case 'FRIEND_REQUEST_RECEIVED':
				setIncomingFriendRequests((prev) => upsert(prev, payload))
				setFriendshipStatus(`New friend request from user ${payload.requesterId}.`)
				break
			case 'FRIEND_REQUEST_ACCEPTED':
				setIncomingFriendRequests((prev) => removeByParticipants(prev, payload))
				setSentFriendRequests((prev) => removeByParticipants(prev, payload))
				setFriends((prev) => upsert(prev, { ...payload, status: 'ACCEPTED' }))
				setFriendshipStatus(
					`Friend request accepted by user ${payload.recipientId === currentUserId ? payload.requesterId : payload.recipientId}.`,
				)
				break
			case 'FRIEND_REQUEST_REJECTED':
				setIncomingFriendRequests((prev) => removeByParticipants(prev, payload))
				setSentFriendRequests((prev) => removeByParticipants(prev, payload))
				setFriendshipStatus('A friend request was rejected.')
				break
			case 'FRIEND_REMOVED':
				setFriends((prev) => removeByParticipants(prev, payload))
				setFriendshipStatus('A friend removed you.')
				break
			default:
				break
		}
	}

	const handleSendFriendRequest = async (userId: number) => {
		await sendFriendRequest(userId)
		await loadFriendships()
		setFriendshipStatus(`Friend request sent to user ${userId}.`)
	}

	const handleRespondToFriendRequest = async (userId: number, response: 'ACCEPT' | 'REJECT') => {
		await respondToFriendRequest(userId, response)
		await loadFriendships()
		setFriendshipStatus(
			`Friend request from user ${userId} ${response === 'ACCEPT' ? 'accepted' : 'rejected'}.`,
		)
	}

	const handleCancelFriendRequest = async (userId: number) => {
		await cancelFriendRequest(userId)
		await loadFriendships()
		setFriendshipStatus(`Cancelled friend request to user ${userId}.`)
	}

	return {
		incomingFriendRequests,
		sentFriendRequests,
		friends,
		isFriendshipsLoading,
		friendshipStatus,
		loadFriendships,
		clearFriendships,
		handleFriendshipNotification,
		handleSendFriendRequest,
		handleRespondToFriendRequest,
		handleCancelFriendRequest,
	}
}
