import { useState, type FormEvent } from 'react'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type LoginPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onLogin: (username: string, password: string) => Promise<AuthActionResult>
	onSwitchToSignup: () => void
	onSwitchToPasswordReset: () => void
}

export function LoginPage({
	isSubmitting,
	backendStatus,
	onLogin,
	onSwitchToSignup,
	onSwitchToPasswordReset,
}: LoginPageProps) {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)

		const result = await onLogin(username.trim(), password)
		if (result.ok) {
			setPassword('')
			setFeedback('Logged in successfully.')
			return
		}

		setFeedback(result.error)
	}

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4 text-[var(--text-primary)] sm:p-6">
			<div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
				<div className="mb-5">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Welcome Back</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Login to Kurakaani</h1>
					<p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in to continue your chats and rooms.</p>
					<p className="mt-2 text-xs text-[var(--text-muted)]">{backendStatus}</p>
					{feedback && <p className="mt-2 text-sm text-[var(--text-secondary)]">{feedback}</p>}
				</div>

				<form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
					<label className="block text-xs font-medium text-[var(--text-secondary)]">
						Username
						<input
							type="text"
							required
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
						/>
					</label>
					<label className="block text-xs font-medium text-[var(--text-secondary)]">
						Password
						<input
							type="password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
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

				<p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
					Don&apos;t have an account?{' '}
					<button
						type="button"
						onClick={onSwitchToSignup}
						className="font-semibold text-[var(--accent)] hover:underline"
					>
						Create one
					</button>
				</p>
				<p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
					Forgot password?{' '}
					<button
						type="button"
						onClick={onSwitchToPasswordReset}
						className="font-semibold text-[var(--accent)] hover:underline"
					>
						Reset here
					</button>
				</p>
			</div>
		</section>
	)
}
