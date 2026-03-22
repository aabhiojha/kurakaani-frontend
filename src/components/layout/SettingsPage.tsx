import { Download, Moon, Sun } from 'lucide-react'

type SettingsPageProps = {
	isDarkMode: boolean
	onToggleDarkMode: () => void
}

export function SettingsPage({ isDarkMode, onToggleDarkMode }: SettingsPageProps) {
	return (
		<section className="flex min-w-0 flex-1 bg-[var(--bg-surface-alt)] p-6 text-[var(--text-primary)]">
			<div className="mx-auto w-full max-w-4xl space-y-6">
				<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
					<h1 className="text-2xl font-semibold">Settings</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">Control appearance and account preferences.</p>

					<div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-alt)] p-4">
						<div>
							<h2 className="text-base font-semibold">Dark Mode</h2>
							<p className="text-sm text-[var(--text-secondary)]">Use the near-black interface palette.</p>
						</div>
						<button
							type="button"
							onClick={onToggleDarkMode}
							className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--toggle-bg)] px-3 py-2 text-sm font-medium text-[var(--toggle-text)] transition hover:opacity-90"
							aria-label="toggle dark mode"
						>
							{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
							{isDarkMode ? 'Light' : 'Dark'}
						</button>
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
