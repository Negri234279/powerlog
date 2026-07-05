'use client'

import { type FormEvent, useState } from 'react'

import { gqlErrorMessage } from '@/lib/graphql/error'
import { useForgotPassword } from '@/lib/graphql/hooks/use-auth'
import { AuthCard } from '@/components/auth/auth-card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedLink } from '@/components/ui/tracked'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function ForgotPasswordForm() {
    const forgot = useForgotPassword()
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
        if (!EMAIL_RE.test(email)) {
            setError('Enter a valid email address.')
            return
        }
        setError(null)
        try {
            await forgot.mutateAsync(email)
            // The API never reveals whether the email exists — same message either way.
            setSent(true)
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    if (sent) {
        return (
            <AuthCard
                title="Check your inbox"
                subtitle="If an account exists for that email, we’ve sent a reset link."
                footer={
                    <TrackedLink
                        analyticsId="forgot-back-to-login"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        Back to login
                    </TrackedLink>
                }
            >
                <p className="text-body text-text-dim">Didn’t get it? Check spam, or try again in a minute.</p>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title="Reset your password"
            subtitle="Enter your email and we’ll send a reset link."
            footer={
                <>
                    Remembered it?{' '}
                    <TrackedLink
                        analyticsId="forgot-login-link"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        Log in
                    </TrackedLink>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <Field label="Email" htmlFor="email" error={error ?? undefined}>
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                </Field>
                <SubmitButton analyticsId="forgot-submit" loading={forgot.isPending}>
                    Send reset link
                </SubmitButton>
            </form>
        </AuthCard>
    )
}
