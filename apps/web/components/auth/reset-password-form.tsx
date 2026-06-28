'use client'

import Link from 'next/link'
import { type FormEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useResetPassword } from '@/lib/graphql/hooks/use-auth'
import { AuthCard } from '@/components/auth/auth-card'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'

/** Completes a password reset with the token from the email link. On success the
 *  API revokes all sessions, so the user re-logs in everywhere. */
export function ResetPasswordForm({ token }: { token: string | null }) {
    const reset = useResetPassword()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!token) return
        const data = new FormData(event.currentTarget)
        const newPassword = String(data.get('newPassword') ?? '')
        const confirm = String(data.get('confirm') ?? '')

        const next: Record<string, string> = {}
        if (newPassword.length < 8) next['newPassword'] = 'At least 8 characters.'
        if (confirm !== newPassword) next['confirm'] = 'Passwords don’t match.'
        setErrors(next)
        if (Object.keys(next).length > 0) return

        setFormError(null)
        try {
            await reset.mutateAsync({ token, newPassword })
            track('password_reset', {})
            setDone(true)
        } catch (err) {
            setFormError(gqlErrorMessage(err))
        }
    }

    if (!token) {
        return (
            <AuthCard
                title="Invalid link"
                subtitle="This page needs a reset token from your email link."
                footer={
                    <Link href="/forgot-password" className="text-text underline-offset-4 hover:underline">
                        Request a new link
                    </Link>
                }
            >
                <p className="text-body text-text-dim">The link looks incomplete or expired.</p>
            </AuthCard>
        )
    }

    if (done) {
        return (
            <AuthCard title="Password reset" subtitle="You can now log in with your new password.">
                <Link
                    href="/login"
                    className="inline-flex rounded-full bg-ember-gradient px-6 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    Go to login
                </Link>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title="Set a new password"
            subtitle="Choose a new password for your account."
            footer={
                <>
                    Changed your mind?{' '}
                    <Link href="/login" className="text-text underline-offset-4 hover:underline">
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
                <Field label="Confirm password" htmlFor="confirm" error={errors['confirm']}>
                    <Input
                        id="confirm"
                        name="confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                    />
                </Field>
                <FormError error={formError} />
                <SubmitButton loading={reset.isPending}>Reset password</SubmitButton>
            </form>
        </AuthCard>
    )
}
