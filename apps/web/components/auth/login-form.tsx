'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { AuthCard } from '@/components/auth/auth-card'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedLink } from '@/components/ui/tracked'
import { track } from '@/lib/analytics/events'
import { gqlErrorCode, gqlErrorMessage } from '@/lib/graphql/error'
import { useLogin } from '@/lib/graphql/hooks/use-auth'
import { fieldErrors, loginSchema } from '@/lib/validation/auth'

export function LoginForm() {
    const router = useRouter()
    const login = useLogin()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const parsed = loginSchema.safeParse({
            email: String(data.get('email') ?? ''),
            password: String(data.get('password') ?? ''),
        })
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error))
            return
        }
        setErrors({})
        setFormError(null)
        try {
            await login.mutateAsync(parsed.data)
            track('user_logged_in', { method: 'password' })
            router.replace('/dashboard')
        } catch (error) {
            track('auth_failed', { action: 'login', code: gqlErrorCode(error) })
            setFormError(gqlErrorMessage(error))
        }
    }

    return (
        <AuthCard
            title="Welcome back"
            subtitle="Log in to keep the streak alive."
            footer={
                <>
                    New here?{' '}
                    <TrackedLink
                        analyticsId="login-register-link"
                        href="/register"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        Create an account
                    </TrackedLink>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <Field label="Email" htmlFor="email" error={errors['email']}>
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                </Field>
                <Field label="Password" htmlFor="password" error={errors['password']}>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                    />
                </Field>

                <div className="text-right">
                    <TrackedLink
                        analyticsId="login-forgot-password"
                        href="/forgot-password"
                        className="text-sm text-text-dim underline-offset-4 transition-colors hover:text-text hover:underline"
                    >
                        Forgot password?
                    </TrackedLink>
                </div>

                <FormError error={formError} />

                <SubmitButton analyticsId="login-submit" loading={login.isPending}>
                    Log in
                </SubmitButton>
            </form>
        </AuthCard>
    )
}
