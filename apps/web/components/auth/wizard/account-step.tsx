'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type SubmitEvent, useState, useTransition } from 'react'

import { Field, Input, Select } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'
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
    onBack,
    onDone,
}: {
    defaults: RegisterValues | null
    invited: boolean
    prefillEmail: string
    prefillUsername: string
    coachUsername: string | null
    /** Omitted when this is the first step — no previous step to go back to. */
    onBack?: () => void
    onDone: (values: RegisterValues) => void
}) {
    const t = useTranslations('auth')
    const tw = useTranslations('auth.wizard')
    const te = (key?: string) => (key ? t(`errors.${key}`) : undefined)
    const router = useRouter()
    const locale = useLocale() as Locale
    const [, startTransition] = useTransition()
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [email, setEmail] = useState(defaults?.email ?? prefillEmail)
    const [username, setUsername] = useState(defaults?.username ?? prefillUsername)

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
                    className="flex-1 rounded-full bg-ember-gradient px-6 py-3 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    {tw('continue')}
                </TrackedButton>
            </div>
        </form>
    )
}
