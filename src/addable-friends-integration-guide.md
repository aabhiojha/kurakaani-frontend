# Addable Friends — Frontend Integration Guide

Feature: **Show friends the current user can add to a specific room** (i.e. friends not already a member).

---

## Endpoint

```
GET /api/rooms/room/{roomId}/add/friends
Authorization: Bearer <jwt>
```

Returns friends of the authenticated user who are **not already members** of the given room.

---

## Response shape

```json
[
  {
    "userId": 2,
    "username": "abhishek1",
    "profilePicUrl": "profile/970bc403-046d-4ce6-8c70-ffb4721cef80_erd.png"
  },
  {
    "userId": 6,
    "username": "ram",
    "profilePicUrl": null
  }
]
```

Same shape as `GET /api/friend/friends` — reuses the existing `FriendUserResponse` type.

---

## Step 1 — Service function

Add to `src/services/roomService.ts`:

```ts
import type { FriendUserResponse } from '../types/api/friend'

export const getAddableFriends = (roomId: number) =>
    apiFetch<FriendUserResponse[]>(`/api/rooms/room/${roomId}/add/friends`)
```

> `FriendUserResponse` is already defined in `src/types/api/friend.ts`:
> ```ts
> export type FriendUserResponse = {
>     userId: number
>     username: string
>     profilePicUrl: string | null
> }
> ```

---

## Step 2 — Load in the component

Fetch when the user opens the "Add Members" UI for a room. Use a loading flag and reset on `roomId` change.

```ts
import { getAddableFriends } from '../../services/roomService'
import type { FriendUserResponse } from '../../types/api/friend'

const [addableFriends, setAddableFriends] = useState<FriendUserResponse[]>([])
const [isLoadingAddable, setIsLoadingAddable] = useState(false)

useEffect(() => {
    if (!roomId) return
    let disposed = false

    setIsLoadingAddable(true)
    getAddableFriends(roomId)
        .then((data) => { if (!disposed) setAddableFriends(data) })
        .catch(() => { if (!disposed) setAddableFriends([]) })
        .finally(() => { if (!disposed) setIsLoadingAddable(false) })

    return () => { disposed = true }
}, [roomId])
```

---

## Step 3 — Render

Use `resolveAssetUrl` from `src/lib/config.ts` for profile images. Falls back to initials when `profilePicUrl` is null.

```tsx
import { resolveAssetUrl } from '../../lib/config'

{isLoadingAddable ? (
    <p className="text-sm text-[var(--text-secondary)]">Loading friends…</p>
) : addableFriends.length === 0 ? (
    <p className="text-sm text-[var(--text-secondary)]">No friends to add.</p>
) : (
    <div className="space-y-2">
        {addableFriends.map((friend) => {
            const avatarUrl = resolveAssetUrl(friend.profilePicUrl)
            const initials = friend.username.slice(0, 2).toUpperCase()

            return (
                <div key={friend.userId} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-[10px] font-semibold text-white">
                            {avatarUrl
                                ? <img src={avatarUrl} alt={friend.username} className="h-full w-full object-cover" />
                                : initials}
                        </div>
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{friend.username}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleAddFriend(friend.userId)}
                        className="motion-interactive rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--bg-page)] hover:bg-[var(--accent-strong)]"
                    >
                        Add
                    </button>
                </div>
            )
        })}
    </div>
)}
```

---

## Step 4 — Handle the Add action

After a friend is added, refresh the addable list and the room members list so both stay in sync.

```ts
const handleAddFriend = async (userId: number) => {
    await addUsersToRoom(roomId, [userId])
    // refresh both lists
    const [updatedAddable, updatedMembers] = await Promise.all([
        getAddableFriends(roomId),
        getRoomMembers(roomId),
    ])
    setAddableFriends(updatedAddable)
    setRoomMembers(updatedMembers)           // existing state from parent / ChatView
}
```

> `addUsersToRoom` is already in `src/services/roomService.ts` — it calls `PATCH /api/rooms/room/{roomId}` with `{ userId: [userId] }`.

---

## Empty state

If `addableFriends` is empty it means one of three things:
- The user has no friends yet.
- All friends are already in the room.
- The user is not authenticated (the backend will return 401 — caught by `apiFetch` and thrown as an error).

Show a contextual message accordingly.

---

## Where to place this in the existing UI

In `src/components/chat/ChatView.tsx`, the Settings right-panel (`rightPanelMode === 'settings'`) already has an "Add Users" form that takes raw user IDs. The addable-friends list should sit **above** that form as the primary invite path, with the raw ID form kept as a fallback for advanced use.

```
[ Current Members ]
[ Add from Friends ]   ← new section (this guide)
[ Add by User ID  ]   ← existing form
```
