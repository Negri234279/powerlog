'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useChangePassword, useMe } from '@/lib/graphql/hooks/use-auth'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { PasswordInput } from '@/components/ui/password-input'
import { SubmitButton } from '@/components/ui/submit-button'

/**
 * Change (or, for a Google-only account, set) the account password. The current
 * password is required only when the account already has one; the API rejects a
 * wrong current password with INVALID_CURRENT_PASSWORD, surfaced inline.
 */
export function ChangePasswordCard() {
    const t = useTranslations('profile')
    const ta = useTranslations('auth.errors')
    const errorMessage = useErrorMessage()
    const { data: me } = useMe()
    const change = useChangePassword()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const hasPassword = me?.hasPassword ?? true

    async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const currentPassword = String(data.get('currentPassword') ?? '')
        const newPassword = String(data.get('newPassword') ?? '')
        const confirm = String(data.get('confirm') ?? '')

        const next: Record<string, string> = {}
        if (hasPassword && currentPassword.trim() === '') next['currentPassword'] = t('enterCurrent')
        if (newPassword.length < 8) next['newPassword'] = ta('passwordMin')
        if (confirm !== newPassword) next['confirm'] = ta('passwordsMismatch')
        setErrors(next)
        if (Object.keys(next).length > 0) return

        setFormError(null)
        setDone(false)
        try {
            await change.mutateAsync({
                currentPassword: hasPassword ? currentPassword : undefined,
                newPassword,
            })
            track('password_changed', {})
            setDone(true)
            form.reset()
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('securityEyebrow')}</p>
                <h2 className="mt-3 font-display text-h3 text-text">
                    {hasPassword ? t('changePassword') : t('setPassword')}
                </h2>
                <p className="mt-3 max-w-lg text-body text-text-dim">
                    {hasPassword ? t('changePasswordBody') : t('setPasswordBody')}
                </p>

                <form onSubmit={onSubmit} className="mt-6 max-w-sm space-y-4" noValidate>
                    {hasPassword ? (
                        <Field label={t('currentPassword')} htmlFor="currentPassword" error={errors['currentPassword']}>
                            <PasswordInput
                                id="currentPassword"
                                name="currentPassword"
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                        </Field>
                    ) : null}
                    <Field
                        label={t('newPassword')}
                        htmlFor="newPassword"
                        error={errors['newPassword']}
                        hint={ta('passwordMin')}
                    >
                        <PasswordInput
                            id="newPassword"
                            name="newPassword"
                            autoComplete="new-password"
                            placeholder="••••••••"
                        />
                    </Field>
                    <Field label={t('confirmNewPassword')} htmlFor="confirm" error={errors['confirm']}>
                        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" placeholder="••••••••" />
                    </Field>

                    <FormError error={formError} />
                    {done ? <p className="text-sm text-pr">{t('passwordUpdated')}</p> : null}

                    <SubmitButton analyticsId="password-change-submit" loading={change.isPending}>
                        {hasPassword ? t('updatePassword') : t('setPasswordBtn')}
                    </SubmitButton>
                </form>
            </div>
        </div>
    )
}
