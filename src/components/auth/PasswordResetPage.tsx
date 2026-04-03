import { useState, type FormEvent } from 'react'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type PasswordResetPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onRequestReset: (email: string) => Promise<AuthActionResult>
	onSwitchToLogin: () => void
	onSwitchToTokenPage: () => void
}

export function PasswordResetPage({
	isSubmitting,
	backendStatus,
	onRequestReset,
	onSwitchToLogin,
	onSwitchToTokenPage,
}: PasswordResetPageProps) {
	const [email, setEmail] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)

		const result = await onRequestReset(email.trim())
		if (result.ok) {
			setFeedback(result.message ?? 'Reset token sent to your email.')
			return
		}

		setFeedback(result.error)
	}

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4 text-[var(--text-primary)] sm:p-6">
			<div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
				<div className="mb-5">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Recover Account</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Reset Password</h1>
					<p className="mt-2 text-sm text-[var(--text-secondary)]">Enter your email to receive a reset token.</p>
					<p className="mt-2 text-xs text-[var(--text-muted)]">{backendStatus}</p>
					{feedback && <p className="mt-2 text-sm text-[var(--text-secondary)]">{feedback}</p>}
				</div>

				<form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
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
					<button
						type="submit"
						disabled={isSubmitting}
						className="motion-interactive w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isSubmitting ? 'Submitting...' : 'Send Reset Token'}
					</button>
				</form>

				<div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
					<button type="button" onClick={onSwitchToLogin} className="font-semibold text-[var(--accent)] hover:underline">
						Back to Login
					</button>
					<button type="button" onClick={onSwitchToTokenPage} className="font-semibold text-[var(--accent)] hover:underline">
						Enter Token
					</button>
				</div>
			</div>
		</section>
	)
}
