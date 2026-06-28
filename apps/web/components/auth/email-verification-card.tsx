'use client'

import { useState } from 'react'

import { gqlErrorMessage } from '@/lib/graphql/error'
import { useMe, useResendEmailVerification } from '@/lib/graphql/hooks/use-auth'
import { Mail } from '@/components/ui/icons'

/**
 * Prompt to verify the account email. Renders only while unverified — once the
 * email is confirmed there's nothing to do (the dashboard shows the verified
 * badge). The actual verification happens on the /verify-email link page.
 */
export function EmailVerificationCard() {
    const { data: me } = useMe()
    const resend = useResendEmailVerification()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!me || me.emailVerified) return null

    async function onResend() {
        setError(null)
        try {
            await resend.mutateAsync()
            setSent(true)
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <div className="flex items-start gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ember/10 text-ember">
                        <Mail className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-mono text-eyebrow uppercase text-text-faint">Email</p>
                        <h2 className="mt-2 font-display text-h3 text-text">Verify your email</h2>
                        <p className="mt-2 max-w-lg text-body text-text-dim">
                            We sent a link to <span className="text-text">{me.email}</span>. Click it to verify. Didn’t
                            get it?
                        </p>

                        {sent ? (
                            <p className="mt-4 text-sm text-pr">Verification email sent. Check your inbox.</p>
                        ) : (
                            <button
                                type="button"
                                onClick={onResend}
                                disabled={resend.isPending}
                                className="mt-4 rounded-full px-5 py-2.5 text-sm text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] disabled:opacity-60"
                            >
                                {resend.isPending ? 'Sending…' : 'Resend verification email'}
                            </button>
                        )}
                        {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
