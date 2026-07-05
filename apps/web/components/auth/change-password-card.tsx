'use client'

import { type FormEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useChangePassword, useMe } from '@/lib/graphql/hooks/use-auth'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'

/**
 * Change (or, for a Google-only account, set) the account password. The current
 * password is required only when the account already has one; the API rejects a
 * wrong current password with INVALID_CURRENT_PASSWORD, surfaced inline.
 */
export function ChangePasswordCard() {
    const { data: me } = useMe()
    const change = useChangePassword()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const hasPassword = me?.hasPassword ?? true

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const currentPassword = String(data.get('currentPassword') ?? '')
        const newPassword = String(data.get('newPassword') ?? '')
        const confirm = String(data.get('confirm') ?? '')

        const next: Record<string, string> = {}
        if (hasPassword && currentPassword.trim() === '') next['currentPassword'] = 'Enter your current password.'
        if (newPassword.length < 8) next['newPassword'] = 'At least 8 characters.'
        if (confirm !== newPassword) next['confirm'] = 'Passwords don’t match.'
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
            setFormError(gqlErrorMessage(error))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <p className="font-mono text-eyebrow uppercase text-text-faint">Security</p>
                <h2 className="mt-3 font-display text-h3 text-text">
                    {hasPassword ? 'Change password' : 'Set a password'}
                </h2>
                <p className="mt-3 max-w-lg text-body text-text-dim">
                    {hasPassword
                        ? 'Update your password. You’ll stay signed in on this device.'
                        : 'Your account signs in with Google. Set a password to also log in with email.'}
                </p>

                <form onSubmit={onSubmit} className="mt-6 max-w-sm space-y-4" noValidate>
                    {hasPassword ? (
                        <Field label="Current password" htmlFor="currentPassword" error={errors['currentPassword']}>
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                        </Field>
                    ) : null}
                    <Field
                        label="New password"
                        htmlFor="newPassword"
                        error={errors['newPassword']}
                        hint="At least 8 characters"
                    >
                        <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                        />
                    </Field>
                    <Field label="Confirm new password" htmlFor="confirm" error={errors['confirm']}>
                        <Input
                            id="confirm"
                            name="confirm"
                            type="password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                        />
                    </Field>

                    <FormError error={formError} />
                    {done ? <p className="text-sm text-pr">Password updated.</p> : null}

                    <SubmitButton analyticsId="password-change-submit" loading={change.isPending}>
                        {hasPassword ? 'Update password' : 'Set password'}
                    </SubmitButton>
                </form>
            </div>
        </div>
    )
}
