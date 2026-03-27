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

export const uploadProfileImage = (file: File) => {
	const formData = new FormData()
	formData.append('file', file)

	return apiFetch<void>('/api/user/profilePic/upload', {
		method: 'POST',
		body: formData,
	})
}

export const buildSessionFromAuth = (authResponse: LoginResponse, currentUser?: CurrentUserResponse): SessionState => ({
	accessToken: authResponse.token,
	user: {
		id: currentUser?.id ?? 0,
		email: currentUser?.email ?? '',
		name: currentUser?.userName ?? authResponse.username,
		roles: currentUser?.roles ?? authResponse.roles,
		profileImageUrl: currentUser?.profileImageUrl,
	},
})

export const saveSession = (session: SessionState) => {
	setSession(session)
}

export const logout = () => {
	clearSession()
}
