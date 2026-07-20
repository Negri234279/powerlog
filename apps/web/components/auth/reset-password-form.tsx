'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useResetPassword } from '@/lib/graphql/hooks/use-auth'
import { AuthCard } from '@/components/auth/auth-card'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { PasswordInput } from '@/components/ui/password-input'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedLink } from '@/components/ui/tracked'

/** Completes a password reset with the token from the email link. On success the
 *  API revokes all sessions, so the user re-logs in everywhere. */
export function ResetPasswordForm({ token }: { token: string | null }) {
    const t = useTranslations('auth')
    const errorMessage = useErrorMessage()
    const reset = useResetPassword()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!token) return
        const data = new FormData(event.currentTarget)
        const newPassword = String(data.get('newPassword') ?? '')
        const confirm = String(data.get('confirm') ?? '')

        const next: Record<string, string> = {}
        if (newPassword.length < 8) next['newPassword'] = t('errors.passwordMin')
        if (confirm !== newPassword) next['confirm'] = t('errors.passwordsMismatch')
        setErrors(next)
        if (Object.keys(next).length > 0) return

        setFormError(null)
        try {
            await reset.mutateAsync({ token, newPassword })
            track('password_reset', {})
            setDone(true)
        } catch (err) {
            setFormError(errorMessage(err))
        }
    }

    if (!token) {
        return (
            <AuthCard
                title={t('reset.invalidTitle')}
                subtitle={t('reset.invalidSubtitle')}
                footer={
                    <TrackedLink
                        analyticsId="reset-request-new-link"
                        href="/forgot-password"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        {t('reset.requestNew')}
                    </TrackedLink>
                }
            >
                <p className="text-body text-text-dim">{t('reset.invalidBody')}</p>
            </AuthCard>
        )
    }

    if (done) {
        return (
            <AuthCard title={t('reset.doneTitle')} subtitle={t('reset.doneSubtitle')}>
                <TrackedLink
                    analyticsId="reset-go-to-login"
                    href="/login"
                    className="inline-flex rounded-full bg-ember-gradient px-6 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    {t('reset.goToLogin')}
                </TrackedLink>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title={t('reset.title')}
            subtitle={t('reset.subtitle')}
            footer={
                <>
                    {t('reset.changedMind')}{' '}
                    <TrackedLink
                        analyticsId="reset-login-link"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        {t('reset.login')}
                    </TrackedLink>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <Field
                    label={t('fields.newPassword')}
                    htmlFor="newPassword"
                    error={errors['newPassword']}
                    hint={t('fields.passwordHint')}
                >
                    <PasswordInput
                        id="newPassword"
                        name="newPassword"
                        autoComplete="new-password"
                        placeholder="••••••••"
                    />
                </Field>
                <Field label={t('fields.confirmPassword')} htmlFor="confirm" error={errors['confirm']}>
                    <PasswordInput id="confirm" name="confirm" autoComplete="new-password" placeholder="••••••••" />
                </Field>
                <FormError error={formError} />
                <SubmitButton analyticsId="reset-submit" loading={reset.isPending}>
                    {t('reset.submit')}
                </SubmitButton>
            </form>
        </AuthCard>
    )
}
