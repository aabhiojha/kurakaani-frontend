import { Laptop, Moon, Sun } from 'lucide-react'

type SettingsPageProps = {
	themeMode: 'light' | 'dark' | 'system'
	isDarkMode: boolean
	onThemeModeChange: (mode: 'light' | 'dark' | 'system') => void
	sessionName?: string
	backendStatus: string
	onLogout: () => void
}

export function SettingsPage({
	themeMode,
	isDarkMode,
	onThemeModeChange,
	sessionName,
	backendStatus,
	onLogout,
}: SettingsPageProps) {
	const modeButtonClass = (mode: 'light' | 'dark' | 'system') =>
		`motion-interactive inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
			themeMode === mode
				? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
				: 'border-[var(--border)] bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:opacity-90'
		}`

	return (
		<section className="flex min-w-0 flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] p-3 text-[var(--text-primary)] sm:p-4 lg:p-6">
			<div className="mx-auto w-full max-w-4xl space-y-6">
				<div className="mb-1">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace Preferences</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
				</div>

				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-6">
					<h2 className="text-lg font-semibold tracking-tight">Session</h2>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">Current authenticated session for API requests and WebSocket chat.</p>

					<div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-semibold">Session Status</p>
							<p className="text-sm text-[var(--text-secondary)]">Signed in as {sessionName ?? 'User'}</p>
							<p className="mt-1 text-xs text-[var(--text-muted)]">{backendStatus}</p>
						</div>
						<button
							type="button"
							onClick={onLogout}
							className="motion-interactive rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:opacity-90"
						>
							Logout
						</button>
					</div>
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
