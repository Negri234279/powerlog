'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { AuthCard } from '@/components/auth/auth-card'
import { Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedLink } from '@/components/ui/tracked'
import { track } from '@/lib/analytics/events'
import { gqlErrorCode, gqlErrorMessage } from '@/lib/graphql/error'
import { useRegister } from '@/lib/graphql/hooks/use-auth'
import { fieldErrors, registerSchema } from '@/lib/validation/auth'

export function RegisterForm() {
    const router = useRouter()
    const register = useRegister()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const parsed = registerSchema.safeParse({
            email: String(data.get('email') ?? ''),
            username: String(data.get('username') ?? ''),
            password: String(data.get('password') ?? ''),
            units: String(data.get('units') ?? 'kg'),
            firstName: data.get('firstName'),
            lastName: data.get('lastName'),
            birthDate: data.get('birthDate'),
            heightCm: data.get('heightCm'),
        })
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error))
            return
        }
        setErrors({})
        setFormError(null)
        try {
            await register.mutateAsync(parsed.data)
            track('user_registered', { method: 'password' })
            router.replace('/dashboard')
        } catch (error) {
            track('auth_failed', { action: 'register', code: gqlErrorCode(error) })
            setFormError(gqlErrorMessage(error))
        }
    }

    return (
        <AuthCard
            title="Create your account"
            subtitle="Free forever for solo lifters."
            footer={
                <>
                    Already lifting with us?{' '}
                    <TrackedLink
                        analyticsId="register-login-link"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        Log in
                    </TrackedLink>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <Field label="Email" htmlFor="email" error={errors['email']}>
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                </Field>
                <Field label="Username" htmlFor="username" error={errors['username']} hint="a–z, 0–9 and underscore">
                    <Input id="username" name="username" autoComplete="username" placeholder="ironmike" />
                </Field>
                <Field label="Password" htmlFor="password" error={errors['password']} hint="At least 8 characters">
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                    />
                </Field>
                <Field label="Preferred units" htmlFor="units" error={errors['units']}>
                    <Select id="units" name="units" defaultValue="kg">
                        <option value="kg">Kilograms (kg)</option>
                        <option value="lb">Pounds (lb)</option>
                    </Select>
                </Field>

                <p className="pt-2 text-xs uppercase tracking-wide text-text-dim">
                    Optional · you can fill these later
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="First name" htmlFor="firstName" error={errors['firstName']}>
                        <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Ada" />
                    </Field>
                    <Field label="Last name" htmlFor="lastName" error={errors['lastName']}>
                        <Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Lovelace" />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Height (cm)" htmlFor="heightCm" error={errors['heightCm']}>
                        <Input id="heightCm" name="heightCm" type="number" min={50} max={300} placeholder="175" />
                    </Field>
                    <Field label="Birthday" htmlFor="birthDate" error={errors['birthDate']}>
                        <Input id="birthDate" name="birthDate" type="date" autoComplete="bday" />
                    </Field>
                </div>

                <FormError error={formError} />

                <SubmitButton analyticsId="register-submit" loading={register.isPending}>
                    Create account
                </SubmitButton>
            </form>
        </AuthCard>
    )
}
