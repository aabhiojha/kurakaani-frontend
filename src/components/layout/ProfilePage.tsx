import { Bell, Camera, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'

export function ProfilePage() {
	return (
		<section className="flex min-w-0 flex-1 bg-[var(--bg-surface-alt)] p-6 text-[var(--text-primary)]">
			<div className="mx-auto flex w-full max-w-5xl gap-6">
				<div className="w-[320px] shrink-0 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
					<div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-[var(--bubble-sent)] text-center text-2xl font-semibold leading-[6rem] text-white">
						YO
						<button
							type="button"
							className="absolute bottom-1 right-1 rounded-full bg-[var(--bg-surface)] p-1.5 text-[var(--text-secondary)] shadow"
							aria-label="change avatar"
						>
							<Camera size={14} />
						</button>
					</div>
					<h1 className="text-center text-xl font-semibold text-[var(--text-primary)]">Yubraj Oli</h1>
					<p className="mb-6 text-center text-sm text-[var(--text-secondary)]">Product Designer at Kurakaani</p>

					<div className="space-y-3 rounded-2xl bg-[var(--bg-soft)] p-4 text-sm text-[var(--text-primary)]">
						<div className="flex items-center gap-2">
							<Mail size={15} className="text-[var(--text-secondary)]" />
							yubraj@kurakaani.app
						</div>
						<div className="flex items-center gap-2">
							<Phone size={15} className="text-[var(--text-secondary)]" />
							+977 9800000000
						</div>
						<div className="flex items-center gap-2">
							<MapPin size={15} className="text-[var(--text-secondary)]" />
							Kathmandu, Nepal
						</div>
					</div>
				</div>

				<div className="min-w-0 flex-1 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
					<div className="mb-6 border-b border-[var(--border)] pb-4">
						<h2 className="text-xl font-semibold text-[var(--text-primary)]">Profile Settings</h2>
						<p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your account details and communication preferences.</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<label className="text-sm font-medium text-[var(--text-secondary)]">
							Display Name
							<input
								type="text"
								defaultValue="Yubraj Oli"
								className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
							/>
						</label>

						<label className="text-sm font-medium text-[var(--text-secondary)]">
							Role
							<input
								type="text"
								defaultValue="Product Designer"
								className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
							/>
						</label>

						<label className="text-sm font-medium text-[var(--text-secondary)] md:col-span-2">
							Bio
							<textarea
								rows={4}
								defaultValue="Designing clear and delightful collaboration experiences for product teams."
								className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
							/>
						</label>
					</div>

					<div className="mt-6 space-y-3 rounded-2xl border border-[var(--border)] p-4">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2 text-[var(--text-primary)]">
								<Bell size={16} className="text-[var(--text-secondary)]" />
								Message Notifications
							</div>
							<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Enabled</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2 text-[var(--text-primary)]">
								<ShieldCheck size={16} className="text-[var(--text-secondary)]" />
								Two-Factor Authentication
							</div>
							<span className="rounded-full bg-[var(--pill-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--pill-text)]">Recommended</span>
						</div>
					</div>

					<div className="mt-6 flex justify-end gap-2">
						<button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)]">
							Cancel
						</button>
						<button type="button" className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] shadow-[0_8px_18px_rgba(26,43,94,0.28)] transition hover:bg-[var(--accent-strong)]">
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</section>
	)
}
