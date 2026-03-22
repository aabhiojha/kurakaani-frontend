import { API_BASE_URL } from './config'
import { getSession } from './session'
import type { ApiError } from '../types/api/session'

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const session = getSession()
	const token = session?.accessToken

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
	})

	if (!response.ok) {
		const error = (await response.json().catch(() => null)) as ApiError | null
		throw error ?? new Error(`Request failed with ${response.status}`)
	}

	if (response.status === 204) {
		return null as T
	}

	return (await response.json()) as T
}

export async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init.headers ?? {}),
		},
	})

	if (!response.ok) {
		const error = (await response.json().catch(() => null)) as ApiError | null
		throw error ?? new Error(`Request failed with ${response.status}`)
	}

	if (response.status === 204) {
		return null as T
	}

	return (await response.json()) as T
}
