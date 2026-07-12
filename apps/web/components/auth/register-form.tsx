'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState, useTransition } from 'react'

import { AuthCard } from '@/components/auth/auth-card'
import { Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedLink } from '@/components/ui/tracked'
import { track } from '@/lib/analytics/events'
import { gqlErrorCode } from '@/lib/graphql/error'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useRegister } from '@/lib/graphql/hooks/use-auth'
import { useCoachInvitationPreview } from '@/lib/graphql/hooks/use-coaching'
import { setLocaleCookie } from '@/lib/i18n/actions'
import { type Locale, LOCALE_LABELS, SUPPORTED_LOCALES } from '@/lib/i18n/config'
import { fieldErrors, registerSchema } from '@/lib/validation/auth'

export function RegisterForm() {
    const t = useTranslations('auth')
    const te = (key?: string) => (key ? t(`errors.${key}`) : undefined)
    const errorMessage = useErrorMessage()
    const router = useRouter()
    const register = useRegister()
    // The form paints in the active locale (browser default for a guest), so the
    // language <Select> starts there. Changing it switches the UI immediately.
    const locale = useLocale() as Locale
    const [, startTransition] = useTransition()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)

    // Invite-aware signup: if the URL carries an ?invite=<token>, prefill the
    // (locked) email and a suggested handle from the pending invitation, so the
    // athlete lands linked to the coach after registering with that exact email.
    const [inviteToken, setInviteToken] = useState<string | null>(null)
    useEffect(() => {
        setInviteToken(new URLSearchParams(window.location.search).get('invite'))
    }, [])
    const preview = useCoachInvitationPreview(inviteToken)
    const invited = Boolean(preview.data)

    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    useEffect(() => {
        if (preview.data) {
            setEmail(preview.data.email)
            setUsername(preview.data.suggestedUsername)
        }
    }, [preview.data])

    function onLocaleChange(next: Locale) {
        if (next === locale) return
        startTransition(async () => {
            await setLocaleCookie(next)
            router.refresh()
        })
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const parsed = registerSchema.safeParse({
            email: String(data.get('email') ?? ''),
            username: String(data.get('username') ?? ''),
            password: String(data.get('password') ?? ''),
            units: String(data.get('units') ?? 'kg'),
            locale: String(data.get('locale') ?? locale),
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
            setFormError(errorMessage(error))
        }
    }

    return (
        <AuthCard
            title={t('register.title')}
            subtitle={t('register.subtitle')}
            languageSwitcher={false}
            footer={
                <>
                    {t('register.haveAccount')}{' '}
                    <TrackedLink
                        analyticsId="register-login-link"
                        href="/login"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        {t('register.login')}
                    </TrackedLink>
                </>
            }
        >
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                {invited ? (
                    <div className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-text ring-1 ring-ember/30">
                        {t('register.invitedBanner', { coach: preview.data?.coachUsername ?? '' })}
                    </div>
                ) : null}
                <Field label={t('fields.email')} htmlFor="email" error={te(errors['email'])}>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('placeholders.email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        readOnly={invited}
                        className={invited ? 'cursor-not-allowed opacity-70' : undefined}
                    />
                </Field>
                <Field
                    label={t('fields.username')}
                    htmlFor="username"
                    error={te(errors['username'])}
                    hint={t('fields.usernameHint')}
                >
                    <Input
                        id="username"
                        name="username"
                        autoComplete="username"
                        placeholder={t('placeholders.username')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </Field>
                <Field
                    label={t('fields.password')}
                    htmlFor="password"
                    error={te(errors['password'])}
                    hint={t('fields.passwordHint')}
                >
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                    />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label={t('fields.units')} htmlFor="units" error={te(errors['units'])}>
                        <Select id="units" name="units" defaultValue="kg">
                            <option value="kg">{t('register.unitsKg')}</option>
                            <option value="lb">{t('register.unitsLb')}</option>
                        </Select>
                    </Field>
                    <Field label={t('fields.language')} htmlFor="locale" error={te(errors['locale'])}>
                        <Select
                            id="locale"
                            name="locale"
                            defaultValue={locale}
                            onChange={(e) => onLocaleChange(e.target.value as Locale)}
                        >
                            {SUPPORTED_LOCALES.map((option) => (
                                <option key={option} value={option}>
                                    {LOCALE_LABELS[option]}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <p className="pt-2 text-xs uppercase tracking-wide text-text-dim">{t('register.optional')}</p>

                <div className="grid grid-cols-2 gap-4">
                    <Field label={t('fields.firstName')} htmlFor="firstName" error={te(errors['firstName'])}>
                        <Input
                            id="firstName"
                            name="firstName"
                            autoComplete="given-name"
                            placeholder={t('placeholders.firstName')}
                        />
                    </Field>
                    <Field label={t('fields.lastName')} htmlFor="lastName" error={te(errors['lastName'])}>
                        <Input
                            id="lastName"
                            name="lastName"
                            autoComplete="family-name"
                            placeholder={t('placeholders.lastName')}
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label={t('fields.height')} htmlFor="heightCm" error={te(errors['heightCm'])}>
                        <Input
                            id="heightCm"
                            name="heightCm"
                            type="number"
                            min={50}
                            max={300}
                            placeholder={t('placeholders.height')}
                        />
                    </Field>
                    <Field label={t('fields.birthday')} htmlFor="birthDate" error={te(errors['birthDate'])}>
                        <Input id="birthDate" name="birthDate" type="date" autoComplete="bday" />
                    </Field>
                </div>

                <FormError error={formError} />

                <SubmitButton analyticsId="register-submit" loading={register.isPending}>
                    {t('register.submit')}
                </SubmitButton>
            </form>
        </AuthCard>
    )
}
