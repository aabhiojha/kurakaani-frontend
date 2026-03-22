import { API_BASE_URL } from '../lib/config'
import { apiFetch, publicFetch } from '../lib/api'
import { clearSession, setSession } from '../lib/session'
import type { OAuthSuccessResponse, PublicAuthResponse, SessionState } from '../types/api/session'

export const getPublicAuthInfo = () => publicFetch<PublicAuthResponse>('/api/auth/public')

export const startGoogleLogin = (loginPath: string) => {
	window.location.href = `${API_BASE_URL}${loginPath}`
}

export const getUserProfile = () => apiFetch('/api/user/profile')

export const saveSession = (session: SessionState | OAuthSuccessResponse) => {
	setSession({
		accessToken: session.accessToken,
		expiresAt: session.expiresAt,
		user: session.user,
	})
}

export const logout = () => {
	clearSession()
}

const isValidSessionState = (session: SessionState): boolean => {
	return (
		typeof session.accessToken === 'string' &&
		session.accessToken.length > 0 &&
		typeof session.expiresAt === 'string' &&
		typeof session.user?.id === 'number' &&
		typeof session.user?.email === 'string' &&
		typeof session.user?.name === 'string' &&
		Array.isArray(session.user?.roles)
	)
}

export const parseSessionFromCallbackUrl = (href: string): SessionState | null => {
	let url: URL

	try {
		url = new URL(href)
	} catch {
		return null
	}

	const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
	const params = new URLSearchParams(url.search)
	const read = (key: string) => params.get(key) ?? hashParams.get(key)

	const accessToken = read('accessToken') ?? read('token') ?? read('jwt')
	const expiresAt = read('expiresAt')

	if (!accessToken || !expiresAt) {
		return null
	}

	const rawUser = read('user')
	if (rawUser) {
		try {
			const user = JSON.parse(rawUser) as SessionState['user']
			const parsed: SessionState = { accessToken, expiresAt, user }
			return isValidSessionState(parsed) ? parsed : null
		} catch {
			return null
		}
	}

	const userIdRaw = read('userId') ?? read('id')
	const email = read('email')
	const name = read('name')
	const rolesRaw = read('roles')

	if (!userIdRaw || !email || !name) {
		return null
	}

	const userId = Number(userIdRaw)
	if (Number.isNaN(userId)) {
		return null
	}

	const roles = rolesRaw ? rolesRaw.split(',').map((role) => role.trim()).filter(Boolean) : ['ROLE_USER']
	const parsed: SessionState = {
		accessToken,
		expiresAt,
		user: {
			id: userId,
			email,
			name,
			roles,
		},
	}

	return isValidSessionState(parsed) ? parsed : null
}
