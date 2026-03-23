import { API_BASE_URL } from './config'
import { getSession } from './session'
import type { ApiError } from '../types/api/session'

const buildApiUrl = (path: string): string => {
	if (/^https?:\/\//i.test(path)) {
		return path
	}

	if (!API_BASE_URL) {
		return path
	}

	const normalizedBase = API_BASE_URL.replace(/\/+$/, '')
	const normalizedPath = path.startsWith('/') ? path : `/${path}`

	if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
		return `${normalizedBase}${normalizedPath.slice(4)}`
	}

	return `${normalizedBase}${normalizedPath}`
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const session = getSession()
	const token = session?.accessToken

	const response = await fetch(buildApiUrl(path), {
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
	const response = await fetch(buildApiUrl(path), {
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
