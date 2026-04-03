import { useState, type FormEvent } from 'react'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type TokenResetPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onConfirmReset: (token: number, password: string) => Promise<AuthActionResult>
	onSwitchToLogin: () => void
	onSwitchToResetRequest: () => void
}

export function TokenResetPage({
	isSubmitting,
	backendStatus,
	onConfirmReset,
	onSwitchToLogin,
	onSwitchToResetRequest,
}: TokenResetPageProps) {
	const [token, setToken] = useState('')
	const [password, setPassword] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)

		const parsedToken = Number(token)
		if (!Number.isInteger(parsedToken) || parsedToken <= 0) {
			setFeedback('Token must be a valid number.')
			return
		}

		const result = await onConfirmReset(parsedToken, password)
		if (result.ok) {
			setFeedback(result.message ?? 'Password reset successful. You can now log in.')
			setPassword('')
			return
		}

		setFeedback(result.error)
	}

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4 text-[var(--text-primary)] sm:p-6">
			<div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
				<div className="mb-5">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Confirm Reset</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Enter Reset Token</h1>
					<p className="mt-2 text-sm text-[var(--text-secondary)]">Enter the token you received and set your new password.</p>
					<p className="mt-2 text-xs text-[var(--text-muted)]">{backendStatus}</p>
					{feedback && <p className="mt-2 text-sm text-[var(--text-secondary)]">{feedback}</p>}
				</div>

				<form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
					<label className="block text-xs font-medium text-[var(--text-secondary)]">
						Token
						<input
							type="text"
							required
							value={token}
							onChange={(event) => setToken(event.target.value)}
							className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
						/>
					</label>
					<label className="block text-xs font-medium text-[var(--text-secondary)]">
						New Password
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
						{isSubmitting ? 'Submitting...' : 'Reset Password'}
					</button>
				</form>

				<div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
					<button type="button" onClick={onSwitchToResetRequest} className="font-semibold text-[var(--accent)] hover:underline">
						Request Token
					</button>
					<button type="button" onClick={onSwitchToLogin} className="font-semibold text-[var(--accent)] hover:underline">
						Back to Login
					</button>
				</div>
			</div>
		</section>
	)
}
