'use client'

import { useRouter } from 'next/navigation'
import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pencil, Trash } from '@/components/ui/icons'
import { ACCEPTED_AVATAR_TYPES, prepareAvatar, validateAvatarFile } from '@/lib/image/avatar-image'
import { type ProfileData, useRemoveAvatar, useUploadAvatar } from '@/lib/graphql/hooks/use-profile'

const ACCEPT_ATTR = ACCEPTED_AVATAR_TYPES.join(',')

/** Two letters from the display name — the fallback when there's no avatar. */
function initials(displayName: string): string {
    return displayName.slice(0, 2).toUpperCase() || '··'
}

/** A staged, not-yet-uploaded selection. */
interface Staged {
    blob: Blob
    previewUrl: string
}

/**
 * Compact avatar control: the avatar itself is the upload target (click or drag &
 * drop), with a hover overlay + edit badge for affordance. Images are validated
 * and downscaled client-side, uploaded via REST, then the token is rotated and
 * the page refreshed so the header avatar updates. Plain <img> on purpose —
 * next/image isn't used (the app isn't on Vercel).
 */
export function AvatarCard({ profile }: { profile: ProfileData }) {
    const upload = useUploadAvatar()
    const remove = useRemoveAvatar()
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)

    const [staged, setStaged] = useState<Staged | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dragging, setDragging] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    // Revoke the staged object URL when it changes or on unmount (no leaks).
    useEffect(() => {
        return () => {
            if (staged) URL.revokeObjectURL(staged.previewUrl)
        }
    }, [staged])

    const shownSrc = staged?.previewUrl ?? profile.avatarUrl ?? null
    const busy = upload.isPending || remove.isPending

    async function onFile(file: File | undefined) {
        if (!file) return
        setError(null)

        const invalid = validateAvatarFile(file)
        if (invalid) {
            setError(invalid)
            return
        }

        try {
            const prepared = await prepareAvatar(file)
            setStaged((prev) => {
                if (prev) URL.revokeObjectURL(prev.previewUrl)
                return prepared
            })
        } catch {
            setError('Could not read that image. Try another file.')
        }
    }

    function onInputChange(event: ChangeEvent<HTMLInputElement>) {
        void onFile(event.target.files?.[0])
        event.target.value = '' // re-fire change if the same file is picked again
    }

    function onDrop(event: DragEvent<HTMLButtonElement>) {
        event.preventDefault()
        setDragging(false)
        if (!busy) void onFile(event.dataTransfer.files?.[0])
    }

    function clearStaged() {
        setStaged((prev) => {
            if (prev) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
        setError(null)
    }

    async function onSave() {
        if (!staged) return
        setError(null)
        try {
            await upload.mutateAsync(staged.blob)
            track('avatar_updated', {})
            clearStaged()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
        }
    }

    async function onRemove() {
        setError(null)
        try {
            await remove.mutateAsync()
            track('avatar_removed', {})
            setConfirmRemove(false)
            router.refresh()
        } catch (err) {
            setConfirmRemove(false)
            setError(err instanceof Error ? err.message : 'Could not remove the avatar.')
        }
    }

    return (
        <div className="rounded-[1.75rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi flex items-center gap-5 rounded-[calc(1.75rem-0.375rem)] bg-surface p-4 sm:p-5">
                {/* Avatar = upload target: click or drag & drop. */}
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    aria-label={shownSrc ? 'Change avatar' : 'Upload avatar'}
                    className={cn(
                        'group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-2xl uppercase text-text outline-none ring-1 transition-all duration-300',
                        dragging
                            ? 'scale-[1.03] ring-2 ring-ember/60'
                            : 'ring-hairline hover:ring-text/30 focus-visible:ring-2 focus-visible:ring-text/40',
                    )}
                >
                    {shownSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shownSrc} alt="Your avatar" className="size-full object-cover" />
                    ) : (
                        initials(profile.displayName)
                    )}

                    {/* Hover/drag scrim with an edit glyph. */}
                    <span
                        className={cn(
                            'absolute inset-0 grid place-items-center bg-black/45 text-white transition-opacity duration-300',
                            dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                    >
                        <Pencil className="size-5" />
                    </span>
                </button>

                {/* Meta + actions. */}
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-h3 leading-none text-text">Profile picture</h2>
                    <p className="mt-1.5 text-sm text-text-dim">
                        {staged ? 'New image ready to save.' : 'JPEG, PNG or WebP · up to 5 MB.'}
                    </p>

                    {error ? <p className="mt-2 text-sm text-ember">{error}</p> : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {staged ? (
                            <>
                                <button
                                    type="button"
                                    onClick={onSave}
                                    disabled={busy}
                                    className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {upload.isPending ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearStaged}
                                    disabled={busy}
                                    className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    disabled={busy}
                                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text active:scale-[0.98] disabled:opacity-50"
                                >
                                    {profile.avatarUrl ? 'Change' : 'Upload'}
                                </button>
                                {profile.avatarUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmRemove(true)}
                                        disabled={busy}
                                        aria-label="Remove avatar"
                                        className="grid size-9 place-items-center rounded-full text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-ember hover:ring-ember/30 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <Trash className="size-4" />
                                    </button>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>

                <input ref={inputRef} type="file" accept={ACCEPT_ATTR} onChange={onInputChange} className="hidden" />
            </div>

            <ConfirmModal
                open={confirmRemove}
                onClose={() => setConfirmRemove(false)}
                onConfirm={onRemove}
                title="Remove avatar?"
                description="Your profile picture will revert to your initials."
                confirmLabel="Remove"
                destructive
                pending={remove.isPending}
            />
        </div>
    )
}
