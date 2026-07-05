'use client'

import { useState } from 'react'

import { gqlErrorMessage } from '@/lib/graphql/error'
import { type SessionData, useMySessions, useRevokeOtherSessions, useRevokeSession } from '@/lib/graphql/hooks/use-auth'
import { TrackedButton } from '@/components/ui/tracked'

/** Best-effort friendly label from a user-agent string (browser · OS). */
function deviceLabel(ua: string | null): string {
    if (!ua) return 'Unknown device'
    const browser = /Edg\//.test(ua)
        ? 'Edge'
        : /OPR\/|Opera/.test(ua)
          ? 'Opera'
          : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Firefox\//.test(ua)
              ? 'Firefox'
              : /Safari\//.test(ua)
                ? 'Safari'
                : ''
    const os = /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Android/.test(ua)
            ? 'Android'
            : /iPhone|iPad|iPod/.test(ua)
              ? 'iOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : ''
    const parts = [browser, os].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : 'Browser'
}

function formatLastUsed(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function SessionRow({ session }: { session: SessionData }) {
    const revoke = useRevokeSession()

    return (
        <li className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-text">
                    <span className="truncate">{deviceLabel(session.userAgent)}</span>
                    {session.current ? (
                        <span className="rounded-full bg-pr/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pr">
                            This device
                        </span>
                    ) : null}
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-faint">
                    {session.ip ?? 'unknown IP'} · last used {formatLastUsed(session.lastUsedAt)}
                </p>
            </div>
            {session.current ? null : (
                <TrackedButton
                    analyticsId="session-revoke"
                    type="button"
                    onClick={() => revoke.mutate(session.id)}
                    disabled={revoke.isPending}
                    className="shrink-0 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-ember hover:ring-ember/30 disabled:opacity-50"
                >
                    {revoke.isPending ? 'Revoking…' : 'Revoke'}
                </TrackedButton>
            )}
        </li>
    )
}

export function SessionsCard() {
    const { data: sessions, isLoading, isError } = useMySessions()
    const revokeOthers = useRevokeOtherSessions()
    const [error, setError] = useState<string | null>(null)

    const hasOthers = (sessions ?? []).some((s) => !s.current)

    async function onRevokeOthers() {
        setError(null)
        try {
            await revokeOthers.mutateAsync()
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <p className="font-mono text-eyebrow uppercase text-text-faint">Security</p>
                <h2 className="mt-3 font-display text-h3 text-text">Active sessions</h2>
                <p className="mt-3 max-w-lg text-body text-text-dim">
                    Devices where you’re signed in. Revoke any you don’t recognise.
                </p>

                {isLoading ? (
                    <p className="mt-6 text-sm text-text-dim">Loading sessions…</p>
                ) : isError || !sessions ? (
                    <p className="mt-6 text-sm text-ember">Couldn’t load your sessions.</p>
                ) : (
                    <>
                        <ul className="mt-4 divide-y divide-hairline">
                            {sessions.map((session) => (
                                <SessionRow key={session.id} session={session} />
                            ))}
                        </ul>
                        {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
                        {hasOthers ? (
                            <TrackedButton
                                analyticsId="sessions-revoke-others"
                                type="button"
                                onClick={onRevokeOthers}
                                disabled={revokeOthers.isPending}
                                className="mt-5 rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                            >
                                {revokeOthers.isPending ? 'Signing out…' : 'Log out other sessions'}
                            </TrackedButton>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}
