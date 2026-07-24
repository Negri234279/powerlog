'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type SubmitEvent, useId, useState, useTransition } from 'react'

import { AvailabilityInput } from '@/components/ui/availability-input'
import { Field, Input, Select } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { useAvailability } from '@/lib/graphql/hooks/use-availability'
import { LEGAL_PATHS } from '@/lib/legal'
import { setLocaleCookie } from '@/lib/i18n/actions'
import { type Locale, LOCALE_LABELS, SUPPORTED_LOCALES } from '@/lib/i18n/config'
import { type RegisterValues, fieldErrors, registerSchema } from '@/lib/validation/auth'

/**
 * The account step: everything `register` needs. Values are validated here and
 * lifted up (not submitted) — the account is created later, on the review step,
 * because a paid plan needs the account to exist before the payment step. `defaults`
 * repopulates the fields when the user steps back into it.
 */
export function AccountStep({
    defaults,
    invited,
    prefillEmail,
    prefillUsername,
    coachUsername,
    accepted,
    onAcceptedChange,
    onBack,
    onDone,
}: {
    defaults: RegisterValues | null
    invited: boolean
    prefillEmail: string
    prefillUsername: string
    coachUsername: string | null
    /** Whether the Terms + Privacy consent is ticked. Lifted so it survives a
     *  step back-and-forth just like the account fields do. */
    accepted: boolean
    onAcceptedChange: (value: boolean) => void
    /** Omitted when this is the first step — no previous step to go back to. */
    onBack?: () => void
    onDone: (values: RegisterValues) => void
}) {
    const t = useTranslations('auth')
    const tw = useTranslations('auth.wizard')
    const te = (key?: string) => (key ? t(`errors.${key}`) : undefined)
    const router = useRouter()
    const locale = useLocale() as Locale
    const consentId = useId()
    const [, startTransition] = useTransition()
    const [errors, setErrors] = useState<Record<string, string>>({})
    // Only surfaced after a submit attempt — the Continue button is already
    // disabled until consent is ticked, but an Enter keypress can still fire.
    const [consentError, setConsentError] = useState(false)

    const [email, setEmail] = useState(defaults?.email ?? prefillEmail)
    const [username, setUsername] = useState(defaults?.username ?? prefillUsername)

    // Live availability. The invited email is locked to the invitation, so there's
    // nothing to check there. A "taken" or still-"checking" field blocks the step.
    const emailStatus = useAvailability('email', email, invited)
    const usernameStatus = useAvailability('username', username)
    const blocked = !accepted || [emailStatus, usernameStatus].some((s) => s === 'checking' || s === 'taken')

    const emailError = emailStatus === 'taken' ? t('errors.emailTaken') : te(errors['email'])
    const usernameError = usernameStatus === 'taken' ? t('errors.usernameTaken') : te(errors['username'])

    // A birth date can't be in the future — cap the picker at today (local date, so
    // it doesn't slip a day near midnight UTC). The server enforces this too.
    const today = new Date().toLocaleDateString('en-CA')

    function onLocaleChange(next: Locale) {
        if (next === locale) return
        startTransition(async () => {
            await setLocaleCookie(next)
            router.refresh()
        })
    }

    function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const parsed = registerSchema.safeParse({
            email,
            username,
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

        // Belt-and-suspenders: the Continue button is disabled while taken/checking,
        // but an Enter keypress could still fire — never advance with a known dup.
        if (emailStatus === 'taken' || usernameStatus === 'taken') return

        // Consent is required to create the account. Same reasoning: the button is
        // disabled without it, but an Enter keypress bypasses that.
        if (!accepted) {
            setConsentError(true)

            return
        }

        setErrors({})
        onDone(parsed.data)
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {invited ? (
                <div className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-text ring-1 ring-ember/30">
                    {t('register.invitedBanner', { coach: coachUsername ?? '' })}
                </div>
            ) : null}

            <Field label={t('fields.email')} htmlFor="email" error={emailError}>
                <AvailabilityInput
                    status={emailStatus}
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
                error={usernameError}
                hint={t('fields.usernameHint')}
            >
                <AvailabilityInput
                    status={usernameStatus}
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
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    defaultValue={defaults?.password ?? ''}
                />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field label={t('fields.units')} htmlFor="units" error={te(errors['units'])}>
                    <Select id="units" name="units" defaultValue={defaults?.units ?? 'kg'}>
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
                        defaultValue={defaults?.firstName ?? ''}
                    />
                </Field>
                <Field label={t('fields.lastName')} htmlFor="lastName" error={te(errors['lastName'])}>
                    <Input
                        id="lastName"
                        name="lastName"
                        autoComplete="family-name"
                        placeholder={t('placeholders.lastName')}
                        defaultValue={defaults?.lastName ?? ''}
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
                        defaultValue={defaults?.heightCm ?? ''}
                    />
                </Field>
                <Field label={t('fields.birthday')} htmlFor="birthDate" error={te(errors['birthDate'])}>
                    <Input
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        max={today}
                        autoComplete="bday"
                        defaultValue={defaults?.birthDate ?? ''}
                    />
                </Field>
            </div>

            <div className="pt-2">
                <label htmlFor={consentId} className="flex items-start gap-3 text-sm text-text-dim">
                    <input
                        id={consentId}
                        type="checkbox"
                        checked={accepted}
                        aria-invalid={consentError}
                        onChange={(e) => {
                            onAcceptedChange(e.target.checked)
                            if (e.target.checked) setConsentError(false)
                        }}
                        className="mt-0.5 size-4 shrink-0 rounded border-hairline bg-bg/60 accent-ember"
                    />
                    <span>
                        {tw.rich('consent', {
                            terms: (chunks) => (
                                <TrackedLink
                                    analyticsId="wizard-consent-terms"
                                    href={LEGAL_PATHS[locale].terms}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-text underline-offset-4 hover:underline"
                                >
                                    {chunks}
                                </TrackedLink>
                            ),
                            privacy: (chunks) => (
                                <TrackedLink
                                    analyticsId="wizard-consent-privacy"
                                    href={LEGAL_PATHS[locale].privacy}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-text underline-offset-4 hover:underline"
                                >
                                    {chunks}
                                </TrackedLink>
                            ),
                        })}
                    </span>
                </label>
                {consentError ? <p className="mt-1.5 text-xs text-ember">{tw('consentRequired')}</p> : null}
            </div>

            <div className="flex items-center gap-3 pt-2">
                {onBack ? (
                    <TrackedButton
                        analyticsId="wizard-account-back"
                        type="button"
                        onClick={onBack}
                        className="rounded-full px-5 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                    >
                        {tw('back')}
                    </TrackedButton>
                ) : null}
                <TrackedButton
                    analyticsId="wizard-account-continue"
                    type="submit"
                    disabled={blocked}
                    className="flex-1 rounded-full bg-ember-gradient px-6 py-3 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {tw('continue')}
                </TrackedButton>
            </div>
        </form>
    )
}
