'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Input } from '@/components/ui/field'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useDeleteAccount, useMe } from '@/lib/graphql/hooks/use-auth'

/**
 * GDPR account deletion (right to erasure). Two-step on purpose: the destructive
 * action is gated behind typing your own handle, so it can't be a stray click.
 * On success the server soft-deletes + scrubs PII and clears the cookies; we
 * bounce to /login.
 */
export function DeleteAccountCard() {
    const { data: me } = useMe()
    const remove = useDeleteAccount()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)

    const username = me?.username ?? ''
    const matches = username.length > 0 && confirm.trim().replace(/^@/, '').toLowerCase() === username.toLowerCase()

    function reset() {
        setOpen(false)
        setConfirm('')
        setError(null)
    }

    async function onDelete() {
        if (!matches) return
        setError(null)
        try {
            await remove.mutateAsync()
            router.replace('/login')
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <p className="font-mono text-eyebrow uppercase text-text-faint">Danger zone</p>
                <h2 className="mt-3 font-display text-h3 text-text">Delete account</h2>
                <p className="mt-3 max-w-lg text-body text-text-dim">
                    Permanently deletes your account and erases your personal data.{' '}
                    <span className="text-text">This can&rsquo;t be undone.</span>
                </p>

                {!open ? (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="mt-6 rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-ember hover:ring-ember/30 active:scale-[0.98]"
                    >
                        Delete account
                    </button>
                ) : (
                    <div className="mt-6 max-w-sm space-y-4">
                        <label htmlFor="confirm-delete" className="block text-sm text-text-dim">
                            Type <span className="font-mono text-text">@{username || 'your-username'}</span> to confirm.
                        </label>
                        <Input
                            id="confirm-delete"
                            name="confirm-delete"
                            autoComplete="off"
                            autoFocus
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder={`@${username || 'username'}`}
                        />

                        {error ? <p className="text-sm text-ember">{error}</p> : null}

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={!matches || remove.isPending}
                                className="rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {remove.isPending ? 'Deleting…' : 'Permanently delete'}
                            </button>
                            <button
                                type="button"
                                onClick={reset}
                                disabled={remove.isPending}
                                className="rounded-full px-5 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
