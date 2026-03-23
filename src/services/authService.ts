import { apiFetch, publicFetch } from '../lib/api'
import { clearSession, setSession } from '../lib/session'
import type { CurrentUserResponse, LoginRequest, LoginResponse, RegisterRequest, SessionState } from '../types/api/session'

export const registerWithPassword = (payload: RegisterRequest) =>
	publicFetch<void>('/api/auth/register', {
		method: 'POST',
		body: JSON.stringify(payload),
	})

export const loginWithPassword = (payload: LoginRequest) =>
	publicFetch<LoginResponse>('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(payload),
	})

export const getCurrentUser = () => apiFetch<CurrentUserResponse>('/api/user/me')

export const buildSessionFromAuth = (authResponse: LoginResponse, currentUser?: CurrentUserResponse): SessionState => ({
	accessToken: authResponse.token,
	user: {
		id: currentUser?.id ?? 0,
		email: currentUser?.email ?? '',
		name: currentUser?.userName ?? authResponse.username,
		roles: currentUser?.roles ?? authResponse.roles,
	},
})

export const saveSession = (session: SessionState) => {
	setSession(session)
}

export const logout = () => {
	clearSession()
}
