import { useState, type FormEvent } from 'react'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type AuthPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onLogin: (username: string, password: string) => Promise<AuthActionResult>
	onRegister: (username: string, email: string, password: string, confirmPassword: string) => Promise<AuthActionResult>
}

export function AuthPage({ isSubmitting, backendStatus, onLogin, onRegister }: AuthPageProps) {
	const [loginUsername, setLoginUsername] = useState('')
	const [loginPassword, setLoginPassword] = useState('')
	const [registerUsername, setRegisterUsername] = useState('')
	const [registerEmail, setRegisterEmail] = useState('')
	const [registerPassword, setRegisterPassword] = useState('')
	const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)

		const result = await onLogin(loginUsername.trim(), loginPassword)
		if (result.ok) {
			setLoginPassword('')
			setFeedback('Logged in successfully.')
			return
		}

		setFeedback(result.error)
	}

	const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)

		const result = await onRegister(registerUsername.trim(), registerEmail.trim(), registerPassword, registerConfirmPassword)
		if (result.ok) {
			setRegisterPassword('')
			setRegisterConfirmPassword('')
			setFeedback(result.message ?? 'Registration successful. Please log in.')
			return
		}

		setFeedback(result.error)
	}

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4 text-[var(--text-primary)] sm:p-6">
			<div className="w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
				<div className="mb-5">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Welcome</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Sign in to Kurakaani</h1>
					<p className="mt-2 text-sm text-[var(--text-secondary)]">Create an account or log in to load your rooms and live chat.</p>
					<p className="mt-2 text-xs text-[var(--text-muted)]">{backendStatus}</p>
					{feedback && <p className="mt-2 text-sm text-[var(--text-secondary)]">{feedback}</p>}
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<form onSubmit={handleLoginSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
						<h2 className="text-sm font-semibold">Login</h2>
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
						<h2 className="text-sm font-semibold">Sign Up</h2>
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
						<label className="block text-xs font-medium text-[var(--text-secondary)]">
							Confirm Password
							<input
								type="password"
								required
								value={registerConfirmPassword}
								onChange={(event) => setRegisterConfirmPassword(event.target.value)}
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
			</div>
		</section>
	)
}
