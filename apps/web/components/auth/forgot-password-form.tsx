'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useForgotPassword } from '@/lib/graphql/hooks/use-auth'
import { AuthCard } from '@/components/auth/auth-card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedLink } from '@/components/ui/tracked'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function ForgotPasswordForm() {
    const t = useTranslations('auth')
    const errorMessage = useErrorMessage()
    const forgot = useForgotPassword()
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
        if (!EMAIL_RE.test(email)) {
            setError(t('errors.invalidEmail'))
            return
        }
        setError(null)
        try {
            await forgot.mutateAsync(email)
            // The API never reveals whether the email exists — same message either way.
            setSent(true)
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    if (sent) {
        return (
            <AuthCard
                title={t('forgot.sentTitle')}
                subtitle={t('forgot.sentSubtitle')}
                footer={
                    <TrackedLink
                        analyticsId="forgot-back-to-login"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        {t('forgot.backToLogin')}
                    </TrackedLink>
                }
            >
                <p className="text-body text-text-dim">{t('forgot.sentBody')}</p>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title={t('forgot.title')}
            subtitle={t('forgot.subtitle')}
            footer={
                <>
                    {t('forgot.remembered')}{' '}
                    <TrackedLink
                        analyticsId="forgot-login-link"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        {t('forgot.login')}
                    </TrackedLink>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <Field label={t('fields.email')} htmlFor="email" error={error ?? undefined}>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('placeholders.email')}
                    />
                </Field>
                <SubmitButton analyticsId="forgot-submit" loading={forgot.isPending}>
                    {t('forgot.submit')}
                </SubmitButton>
            </form>
        </AuthCard>
    )
}
