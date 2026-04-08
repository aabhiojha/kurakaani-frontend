import { useState, type FormEvent } from 'react'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type SignupPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onRegister: (username: string, email: string, password: string, confirmPassword: string) => Promise<AuthActionResult>
	onSwitchToLogin: () => void
}

export function SignupPage({
	isSubmitting,
	backendStatus,
	onRegister,
	onSwitchToLogin,
}: SignupPageProps) {
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)

		const result = await onRegister(username.trim(), email.trim(), password, confirmPassword)
		if (result.ok) {
			setPassword('')
			setConfirmPassword('')
			setFeedback(result.message ?? 'Registration successful.')
			return
		}

		setFeedback(result.error)
	}

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4 text-[var(--text-primary)] sm:p-6">
			<div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
				<div className="mb-5">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Get Started</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Create Your Account</h1>
					<p className="mt-2 text-sm text-[var(--text-secondary)]">Sign up to join Kurakaani and start chatting.</p>
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
						Email
						<input
							type="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
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
					<label className="block text-xs font-medium text-[var(--text-secondary)]">
						Confirm Password
						<input
							type="password"
							required
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
						/>
					</label>
					<button
						type="submit"
						disabled={isSubmitting}
						className="motion-interactive w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isSubmitting ? 'Submitting...' : 'Create Account'}
					</button>
				</form>

				<p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
					Already have an account?{' '}
					<button
						type="button"
						onClick={onSwitchToLogin}
						className="font-semibold text-[var(--accent)] hover:underline"
					>
						Login
					</button>
				</p>
			</div>
		</section>
	)
}
