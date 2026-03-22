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
