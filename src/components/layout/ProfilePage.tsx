import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Mail, ShieldCheck, UserCircle, Users } from 'lucide-react'
import { resolveAssetUrl } from '../../lib/config'
import type { FriendUserResponse } from '../../types/api/friend'
import type { CurrentUserResponse, SessionState } from '../../types/api/session'

type ProfilePageProps = {
	session: SessionState | null
	currentUser?: CurrentUserResponse
	friendships: {
		friends: FriendUserResponse[]
	}
	isFriendshipsLoading: boolean
	onUploadProfileImage?: (file: File) => Promise<void>
}

const getAvatarLabel = (name?: string) => {
	const value = (name ?? '')
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('')

	return value || 'KU'
}

const formatDate = (value?: string) => {
	if (!value) {
		return 'Unavailable'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return 'Unavailable'
	}

	return parsed.toLocaleString([], {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function ProfilePage({
	session,
	currentUser,
	friendships,
	isFriendshipsLoading,
	onUploadProfileImage,
}: ProfilePageProps) {
	const displayName = session?.user.name || currentUser?.userName || 'Kurakaani User'
	const username = currentUser?.userName ?? session?.user.name ?? 'Unavailable'
	const email = session?.user.email || currentUser?.email || 'No email available'
	const roles = currentUser?.roles ?? session?.user.roles ?? []
	const avatarLabel = getAvatarLabel(displayName)
	const profileImageUrl = resolveAssetUrl(currentUser?.profileImageUrl ?? session?.user.profileImageUrl)
	const enabledLabel = currentUser?.enabled === false ? 'Restricted' : 'Active'
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const handleProfileImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || !onUploadProfileImage) {
			return
		}

		setUploadError(null)
		setIsUploading(true)

		try {
			await onUploadProfileImage(file)
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : 'Failed to upload profile image.')
		} finally {
			setIsUploading(false)
			event.target.value = ''
		}
	}

	return (
		<section className="motion-enter flex min-w-0 flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] p-3 text-[var(--text-primary)] sm:p-4 lg:p-6">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-6 xl:flex-row">
				<div className="w-full shrink-0 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6 xl:w-[320px]">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleProfileImageSelection}
					/>
					<div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-[var(--bubble-sent)] text-center text-2xl font-semibold leading-[6rem] text-white">
						{profileImageUrl ? (
							<img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
						) : (
							avatarLabel
						)}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading || !onUploadProfileImage}
							className="motion-interactive absolute bottom-1 right-1 rounded-full bg-[var(--bg-surface)] p-1.5 text-[var(--text-secondary)] shadow"
							aria-label="profile image"
						>
							<Camera size={14} />
						</button>
					</div>
					{isUploading && <p className="mb-2 text-center text-xs text-[var(--text-secondary)]">Uploading profile image…</p>}
					{uploadError && <p className="mb-2 text-center text-xs text-red-500">{uploadError}</p>}
					<h1 className="text-center text-xl font-semibold tracking-tight text-[var(--text-primary)]">{displayName}</h1>
					<p className="mb-2 text-center text-sm text-[var(--text-secondary)]">{email}</p>
					<div className="mb-6 flex justify-center">
						<span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
							{enabledLabel}
						</span>
					</div>

					<div className="space-y-3 rounded-2xl bg-[var(--bg-soft)] p-4 text-sm text-[var(--text-primary)]">
						<div className="flex items-center gap-2">
							<Mail size={15} className="text-[var(--text-secondary)]" />
							<span className="truncate">{email}</span>
						</div>
						<div className="flex items-center gap-2">
							<UserCircle size={15} className="text-[var(--text-secondary)]" />
							User ID #{currentUser?.id ?? session?.user.id ?? 'N/A'}
						</div>
						<div className="flex items-center gap-2">
							<ShieldCheck size={15} className="text-[var(--text-secondary)]" />
							{roles.length > 0 ? roles.join(', ') : 'No roles assigned'}
						</div>
					</div>
				</div>

				<div className="min-w-0 flex-1 space-y-4">
					<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Account</p>
						<div className="mb-6 border-b border-[var(--border)] pb-4">
							<h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Profile Details</h2>
							{/* <p className="mt-1 text-sm text-[var(--text-secondary)]">Authenticated account data from the backend session.</p> */}
						</div>

						<div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-xs font-semibold text-white">
									{profileImageUrl ? (
										<img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
									) : (
										avatarLabel
									)}
								</div>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</p>
									<p className="truncate text-xs text-[var(--text-secondary)]">@{username}</p>
								</div>
							</div>
							<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
								{enabledLabel}
							</span>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Display Name
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{displayName}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Username
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{username}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Email
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{email}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Account Status
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{enabledLabel}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Created At
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{formatDate(currentUser?.createdAt)}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Last Updated
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{formatDate(currentUser?.updatedAt)}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)] md:col-span-2">
								Roles
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{roles.length > 0 ? roles.join(', ') : 'No roles assigned'}
								</div>
							</div>
						</div>
					</div>

					<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6">
						<div className="mb-6 border-b border-[var(--border)] pb-4">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Friendships</p>
							<h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Friends</h2>
							<p className="mt-1 text-sm text-[var(--text-secondary)]">Users you are currently connected with.</p>
						</div>

						<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
							<div className="mb-3 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Users size={16} className="text-[var(--text-secondary)]" />
									<h3 className="text-sm font-semibold text-[var(--text-primary)]">Friends</h3>
								</div>
								<span className="rounded-full bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)]">{friendships.friends.length}</span>
							</div>
							<div className="space-y-3">
								{friendships.friends.map((friend) => {
									const friendAvatarLabel = getAvatarLabel(friend.username)
									const friendImageUrl = resolveAssetUrl(friend.profilePicUrl)
									return (
										<div key={friend.userId} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-xs font-semibold text-white">
												{friendImageUrl ? (
													<img src={friendImageUrl} alt={friend.username} className="h-full w-full object-cover" />
												) : (
													friendAvatarLabel
												)}
											</div>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{friend.username}</p>
												<p className="text-xs text-[var(--text-muted)]">@{friend.username}</p>
											</div>
										</div>
									)
								})}
								{isFriendshipsLoading && <p className="text-sm text-[var(--text-secondary)]">Loading friends…</p>}
								{!isFriendshipsLoading && friendships.friends.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No friends yet.</p>}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
