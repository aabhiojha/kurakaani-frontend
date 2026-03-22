import { Bell, Camera, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'

export function ProfilePage() {
	return (
		<section className="flex min-w-0 flex-1 bg-[#FAFAF7] p-6">
			<div className="mx-auto flex w-full max-w-5xl gap-6">
				<div className="w-[320px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-[#1A2B5E] text-center text-2xl font-semibold leading-[6rem] text-white">
						YO
						<button
							type="button"
							className="absolute bottom-1 right-1 rounded-full bg-white p-1.5 text-slate-600 shadow"
							aria-label="change avatar"
						>
							<Camera size={14} />
						</button>
					</div>
					<h1 className="text-center text-xl font-semibold text-slate-900">Yubraj Oli</h1>
					<p className="mb-6 text-center text-sm text-slate-500">Product Designer at Kurakaani</p>

					<div className="space-y-3 rounded-2xl bg-[#F5F5F0] p-4 text-sm text-slate-700">
						<div className="flex items-center gap-2">
							<Mail size={15} className="text-slate-500" />
							yubraj@kurakaani.app
						</div>
						<div className="flex items-center gap-2">
							<Phone size={15} className="text-slate-500" />
							+977 9800000000
						</div>
						<div className="flex items-center gap-2">
							<MapPin size={15} className="text-slate-500" />
							Kathmandu, Nepal
						</div>
					</div>
				</div>

				<div className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-6 border-b border-slate-100 pb-4">
						<h2 className="text-xl font-semibold text-slate-900">Profile Settings</h2>
						<p className="mt-1 text-sm text-slate-500">Manage your account details and communication preferences.</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<label className="text-sm font-medium text-slate-700">
							Display Name
							<input
								type="text"
								defaultValue="Yubraj Oli"
								className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F5F5F0] px-3 py-2.5 text-sm focus:border-[#1A2B5E] focus:outline-none"
							/>
						</label>

						<label className="text-sm font-medium text-slate-700">
							Role
							<input
								type="text"
								defaultValue="Product Designer"
								className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F5F5F0] px-3 py-2.5 text-sm focus:border-[#1A2B5E] focus:outline-none"
							/>
						</label>

						<label className="text-sm font-medium text-slate-700 md:col-span-2">
							Bio
							<textarea
								rows={4}
								defaultValue="Designing clear and delightful collaboration experiences for product teams."
								className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-[#F5F5F0] px-3 py-2.5 text-sm focus:border-[#1A2B5E] focus:outline-none"
							/>
						</label>
					</div>

					<div className="mt-6 space-y-3 rounded-2xl border border-slate-200 p-4">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2 text-slate-700">
								<Bell size={16} className="text-slate-500" />
								Message Notifications
							</div>
							<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Enabled</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2 text-slate-700">
								<ShieldCheck size={16} className="text-slate-500" />
								Two-Factor Authentication
							</div>
							<span className="rounded-full bg-[#E8EDFF] px-2.5 py-1 text-xs font-semibold text-[#1A2B5E]">Recommended</span>
						</div>
					</div>

					<div className="mt-6 flex justify-end gap-2">
						<button type="button" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
							Cancel
						</button>
						<button type="button" className="rounded-xl bg-[#1A2B5E] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(26,43,94,0.28)] transition hover:bg-[#13214a]">
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</section>
	)
}
