'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { type SessionData, useMySessions, useRevokeOtherSessions, useRevokeSession } from '@/lib/graphql/hooks/use-auth'
import { TrackedButton } from '@/components/ui/tracked'

/** Best-effort friendly label from a user-agent string (browser · OS). Falls back
 *  to `unknown` (a localized label) when the UA yields neither browser nor OS. */
function deviceLabel(ua: string | null, unknown: string): string {
    if (!ua) return unknown
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
    return parts.length > 0 ? parts.join(' · ') : ''
}

function SessionRow({ session }: { session: SessionData }) {
    const t = useTranslations('profile')
    const locale = useLocale()
    const revoke = useRevokeSession()
    const label = deviceLabel(session.userAgent, t('unknownDevice')) || t('browser')
    const lastUsed = new Date(session.lastUsedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

    return (
        <li className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-text">
                    <span className="truncate">{label}</span>
                    {session.current ? (
                        <span className="rounded-full bg-pr/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pr">
                            {t('thisDevice')}
                        </span>
                    ) : null}
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-faint">
                    {session.ip ?? t('unknownIp')} · {t('lastUsed', { when: lastUsed })}
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
                    {revoke.isPending ? t('revoking') : t('revoke')}
                </TrackedButton>
            )}
        </li>
    )
}

export function SessionsCard() {
    const t = useTranslations('profile')
    const errorMessage = useErrorMessage()
    const { data: sessions, isLoading, isError } = useMySessions()
    const revokeOthers = useRevokeOtherSessions()
    const [error, setError] = useState<string | null>(null)

    const hasOthers = (sessions ?? []).some((s) => !s.current)

    async function onRevokeOthers() {
        setError(null)
        try {
            await revokeOthers.mutateAsync()
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('securityEyebrow')}</p>
                <h2 className="mt-3 font-display text-h3 text-text">{t('activeSessions')}</h2>
                <p className="mt-3 max-w-lg text-body text-text-dim">{t('sessionsBody')}</p>

                {isLoading ? (
                    <p className="mt-6 text-sm text-text-dim">{t('loadingSessions')}</p>
                ) : isError || !sessions ? (
                    <p className="mt-6 text-sm text-ember">{t('sessionsError')}</p>
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
                                {revokeOthers.isPending ? t('signingOut') : t('logoutOthers')}
                            </TrackedButton>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}
