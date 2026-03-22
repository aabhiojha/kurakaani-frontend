export type SessionUser = {
	id: number
	email: string
	name: string
	roles: string[]
}

export type SessionState = {
	accessToken: string
	expiresAt: string
	user: SessionUser
}

export type OAuthSuccessResponse = {
	tokenType: 'Bearer'
	accessToken: string
	expiresAt: string
	user: SessionUser
}

export type PublicAuthResponse = {
	message: string
	loginUrl: string
}

export type ApiError = {
	status: number
	error: string
	message: string
	path: string
	timestamp: string
	fieldErrors?: { field: string; message: string }[] | null
}
