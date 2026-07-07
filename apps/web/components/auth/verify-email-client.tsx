'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { track } from '@/lib/analytics/events'
import { useVerifyEmail } from '@/lib/graphql/hooks/use-auth'
import { Check, Close } from '@/components/ui/icons'
import { TrackedLink } from '@/components/ui/tracked'

/** Consumes the token from the verification email link and reports the result.
 *  Runs the mutation exactly once on mount. */
export function VerifyEmailClient({ token }: { token: string | null }) {
    const t = useTranslations('auth.verify')
    const verify = useVerifyEmail()
    const started = useRef(false)

    useEffect(() => {
        if (token && !started.current) {
            started.current = true
            verify.mutate(token, { onSuccess: () => track('email_verified', {}) })
        }
    }, [token, verify])

    const state = !token ? 'missing' : verify.isError ? 'error' : verify.isSuccess ? 'success' : 'verifying'

    return (
        <main className="grid min-h-[100dvh] place-items-center px-6">
            <div className="w-full max-w-md text-center">
                {state === 'success' ? (
                    <>
                        <Badge tone="pr">
                            <Check className="size-7" />
                        </Badge>
                        <h1 className="mt-6 font-display text-h2">{t('successTitle')}</h1>
                        <p className="mt-3 text-body text-text-dim">{t('successBody')}</p>
                        <Cta analyticsId="verify-go-dashboard" href="/dashboard">
                            {t('goDashboard')}
                        </Cta>
                    </>
                ) : state === 'verifying' ? (
                    <>
                        <h1 className="font-display text-h2">{t('verifying')}</h1>
                        <p className="mt-3 text-body text-text-dim">{t('verifyingBody')}</p>
                    </>
                ) : (
                    <>
                        <Badge tone="ember">
                            <Close className="size-7" />
                        </Badge>
                        <h1 className="mt-6 font-display text-h2">
                            {state === 'missing' ? t('missingTitle') : t('errorTitle')}
                        </h1>
                        <p className="mt-3 text-body text-text-dim">
                            {state === 'missing' ? t('missingBody') : t('errorBody')}
                        </p>
                        <Cta analyticsId="verify-back-to-login" href="/login">
                            {t('backToLogin')}
                        </Cta>
                    </>
                )}
            </div>
        </main>
    )
}

function Badge({ tone, children }: { tone: 'pr' | 'ember'; children: React.ReactNode }) {
    return (
        <span
            className={
                tone === 'pr'
                    ? 'mx-auto grid size-14 place-items-center rounded-2xl bg-pr/10 text-pr'
                    : 'mx-auto grid size-14 place-items-center rounded-2xl bg-ember/10 text-ember'
            }
        >
            {children}
        </span>
    )
}

function Cta({ href, children, analyticsId }: { href: string; children: React.ReactNode; analyticsId: string }) {
    return (
        <TrackedLink
            analyticsId={analyticsId}
            href={href}
            className="mt-7 inline-flex rounded-full bg-ember-gradient px-6 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
        >
            {children}
        </TrackedLink>
    )
}
