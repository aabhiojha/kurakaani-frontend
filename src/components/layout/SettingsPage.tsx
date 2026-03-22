import { Download, Laptop, Moon, Sun } from 'lucide-react'

type SettingsPageProps = {
	themeMode: 'light' | 'dark' | 'system'
	isDarkMode: boolean
	onThemeModeChange: (mode: 'light' | 'dark' | 'system') => void
	isAuthenticated: boolean
	sessionName?: string
	backendStatus: string
	onLogin: () => void
	onLogout: () => void
}

export function SettingsPage({
	themeMode,
	isDarkMode,
	onThemeModeChange,
	isAuthenticated,
	sessionName,
	backendStatus,
	onLogin,
	onLogout,
}: SettingsPageProps) {
	const modeButtonClass = (mode: 'light' | 'dark' | 'system') =>
		`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
			themeMode === mode
				? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
				: 'border-[var(--border)] bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:opacity-90'
		}`

	return (
		<section className="flex min-w-0 flex-1 bg-[var(--bg-surface-alt)] p-6 text-[var(--text-primary)]">
			<div className="mx-auto w-full max-w-4xl space-y-6">
				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
					<h2 className="text-lg font-semibold">Backend Connection</h2>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">OAuth2 + JWT session status for API requests and WebSocket chat.</p>

					<div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
						<div>
							<p className="text-sm font-semibold">Auth Status</p>
							<p className="text-sm text-[var(--text-secondary)]">
								{isAuthenticated ? `Signed in as ${sessionName ?? 'User'}` : 'Not signed in'}
							</p>
							<p className="mt-1 text-xs text-[var(--text-muted)]">{backendStatus}</p>
						</div>
						{isAuthenticated ? (
							<button
								type="button"
								onClick={onLogout}
								className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:opacity-90"
							>
								Logout
							</button>
						) : (
							<button
								type="button"
								onClick={onLogin}
								className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-page)] transition hover:bg-[var(--accent-strong)]"
							>
								Login with Google
							</button>
						)}
					</div>
				</div>

				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
					<h1 className="text-2xl font-semibold">Settings</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">Control appearance and account preferences.</p>

					<div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
						<div>
							<h2 className="text-base font-semibold">Theme</h2>
							<p className="text-sm text-[var(--text-secondary)]">Choose light, dark, or follow your system preference.</p>
							<p className="mt-1 text-xs text-[var(--text-muted)]">Current: {isDarkMode ? 'Dark' : 'Light'}</p>
						</div>
						<div className="flex items-center gap-2">
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

				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
					<h2 className="text-lg font-semibold">Style Preview</h2>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">These elements follow your dark mode spec.</p>

					<div className="mt-4 flex flex-wrap gap-2">
						<span className="rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] px-3 py-1 text-xs text-[var(--pill-text)]">UI Design</span>
						<span className="rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] px-3 py-1 text-xs text-[var(--pill-text)]">React</span>
						<span className="rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] px-3 py-1 text-xs text-[var(--pill-text)]">Prototyping</span>
					</div>

					<div className="mt-5 border-l border-[var(--timeline-border)] pl-4">
						<p className="text-sm text-[var(--text-primary)]">Experience Timeline</p>
						<p className="text-xs text-[var(--text-muted)]">Lead Product Designer • 2021 – Present</p>
					</div>

					<div className="mt-5">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-xl border border-[var(--resume-border)] bg-[var(--resume-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--resume-text)] transition hover:opacity-90"
						>
							<Download size={15} />
							Resume
						</button>
					</div>
				</div>
			</div>
		</section>
	)
}
