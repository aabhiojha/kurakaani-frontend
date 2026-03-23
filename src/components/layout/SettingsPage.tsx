import { useState, type FormEvent } from 'react'
import { Laptop, Moon, Sun } from 'lucide-react'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type SettingsPageProps = {
	themeMode: 'light' | 'dark' | 'system'
	isDarkMode: boolean
	onThemeModeChange: (mode: 'light' | 'dark' | 'system') => void
	isAuthenticated: boolean
	isSubmitting: boolean
	sessionName?: string
	backendStatus: string
	onLogin: (username: string, password: string) => Promise<AuthActionResult>
	onRegister: (username: string, email: string, password: string) => Promise<AuthActionResult>
	onLogout: () => void
}

export function SettingsPage({
	themeMode,
	isDarkMode,
	onThemeModeChange,
	isAuthenticated,
	isSubmitting,
	sessionName,
	backendStatus,
	onLogin,
	onRegister,
	onLogout,
}: SettingsPageProps) {
	const [loginUsername, setLoginUsername] = useState('')
	const [loginPassword, setLoginPassword] = useState('')
	const [registerUsername, setRegisterUsername] = useState('')
	const [registerEmail, setRegisterEmail] = useState('')
	const [registerPassword, setRegisterPassword] = useState('')
	const [authFeedback, setAuthFeedback] = useState<string | null>(null)

	const modeButtonClass = (mode: 'light' | 'dark' | 'system') =>
		`motion-interactive inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
			themeMode === mode
				? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
				: 'border-[var(--border)] bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:opacity-90'
		}`

	const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setAuthFeedback(null)

		const result = await onLogin(loginUsername.trim(), loginPassword)
		if (result.ok) {
			setLoginPassword('')
			setAuthFeedback('Logged in successfully.')
			return
		}

		setAuthFeedback(result.error)
	}

	const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setAuthFeedback(null)

		const result = await onRegister(registerUsername.trim(), registerEmail.trim(), registerPassword)
		if (result.ok) {
			setRegisterPassword('')
			setAuthFeedback(result.message ?? 'Registration successful. Please log in.')
			return
		}

		setAuthFeedback(result.error)
	}

	return (
		<section className="flex min-w-0 flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] p-3 text-[var(--text-primary)] sm:p-4 lg:p-6">
			<div className="mx-auto w-full max-w-4xl space-y-6">
				<div className="mb-1">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace Preferences</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
				</div>

				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
					<h2 className="text-lg font-semibold tracking-tight">Backend Connection</h2>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">JWT session status for API requests and WebSocket chat.</p>

					<div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-semibold">Auth Status</p>
							<p className="text-sm text-[var(--text-secondary)]">
								{isAuthenticated ? `Signed in as ${sessionName ?? 'User'}` : 'Not signed in'}
							</p>
							<p className="mt-1 text-xs text-[var(--text-muted)]">{backendStatus}</p>
							{authFeedback && <p className="mt-1 text-xs text-[var(--text-secondary)]">{authFeedback}</p>}
						</div>
						{isAuthenticated ? (
							<button
								type="button"
								onClick={onLogout}
								disabled={isSubmitting}
								className="motion-interactive rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:opacity-90"
							>
								Logout
							</button>
						) : (
							<span className="text-xs text-[var(--text-muted)]">Sign in below to enable protected endpoints.</span>
						)}
					</div>

					{!isAuthenticated && (
						<div className="mt-4 grid gap-3 lg:grid-cols-2">
							<form onSubmit={handleLoginSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
								<h3 className="text-sm font-semibold">Login</h3>
								<label className="block text-xs font-medium text-[var(--text-secondary)]">
									Username
									<input
										type="text"
										required
										value={loginUsername}
										onChange={(event) => setLoginUsername(event.target.value)}
										className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
									/>
								</label>
								<label className="block text-xs font-medium text-[var(--text-secondary)]">
									Password
									<input
										type="password"
										required
										value={loginPassword}
										onChange={(event) => setLoginPassword(event.target.value)}
										className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
									/>
								</label>
								<button
									type="submit"
									disabled={isSubmitting}
									className="motion-interactive w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
								>
									{isSubmitting ? 'Submitting...' : 'Login'}
								</button>
							</form>

							<form onSubmit={handleRegisterSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
								<h3 className="text-sm font-semibold">Register</h3>
								<label className="block text-xs font-medium text-[var(--text-secondary)]">
									Username
									<input
										type="text"
										required
										value={registerUsername}
										onChange={(event) => setRegisterUsername(event.target.value)}
										className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
									/>
								</label>
								<label className="block text-xs font-medium text-[var(--text-secondary)]">
									Email
									<input
										type="email"
										required
										value={registerEmail}
										onChange={(event) => setRegisterEmail(event.target.value)}
										className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
									/>
								</label>
								<label className="block text-xs font-medium text-[var(--text-secondary)]">
									Password
									<input
										type="password"
										required
										value={registerPassword}
										onChange={(event) => setRegisterPassword(event.target.value)}
										className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
									/>
								</label>
								<button
									type="submit"
									disabled={isSubmitting}
									className="motion-interactive w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
								>
									{isSubmitting ? 'Submitting...' : 'Create Account'}
								</button>
							</form>
						</div>
					)}
				</div>

				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
					<h2 className="text-lg font-semibold tracking-tight">Appearance</h2>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">Control appearance and account preferences.</p>

					<div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h2 className="text-base font-semibold">Theme</h2>
							<p className="text-sm text-[var(--text-secondary)]">Choose light, dark, or follow your system preference.</p>
							<p className="mt-1 text-xs text-[var(--text-muted)]">Current: {isDarkMode ? 'Dark' : 'Light'}</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<button type="button" onClick={() => onThemeModeChange('light')} className={modeButtonClass('light')} aria-label="use light theme">
								<Sun size={16} />
								Light
							</button>
							<button type="button" onClick={() => onThemeModeChange('dark')} className={modeButtonClass('dark')} aria-label="use dark theme">
								<Moon size={16} />
								Dark
							</button>
							<button type="button" onClick={() => onThemeModeChange('system')} className={modeButtonClass('system')} aria-label="use system theme">
								<Laptop size={16} />
								System
							</button>
						</div>
					</div>
				</div>

			</div>
		</section>
	)
}
