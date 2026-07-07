'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { LanguageSwitcher } from '@/components/app/language-switcher'
import { AvatarCard } from '@/components/profile/avatar-card'
import { ChangePasswordCard } from '@/components/auth/change-password-card'
import { DeleteAccountCard } from '@/components/auth/delete-account-card'
import { EmailVerificationCard } from '@/components/auth/email-verification-card'
import { SessionsCard } from '@/components/auth/sessions-card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { type ProfileData, useMyProfile, useUpdateProfile } from '@/lib/graphql/hooks/use-profile'

/** Empty string → null (clear the field); trimmed value otherwise. */
function nullify(value: FormDataEntryValue | null): string | null {
    const v = String(value ?? '').trim()
    return v === '' ? null : v
}

function ProfileForm({ profile }: { profile: ProfileData }) {
    const t = useTranslations('profile')
    const errorMessage = useErrorMessage()
    const update = useUpdateProfile()
    const [formError, setFormError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const heightRaw = nullify(data.get('heightCm'))
        setFormError(null)
        setSaved(false)
        try {
            await update.mutateAsync({
                displayName: String(data.get('displayName') ?? '').trim(),
                firstName: nullify(data.get('firstName')),
                lastName: nullify(data.get('lastName')),
                birthDate: nullify(data.get('birthDate')),
                sex: nullify(data.get('sex')),
                heightCm: heightRaw === null ? null : Number(heightRaw),
                bio: nullify(data.get('bio')),
                country: nullify(data.get('country')),
                timezone: nullify(data.get('timezone')),
            })
            track('profile_updated', {})
            setSaved(true)
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    return (
        <form onSubmit={onSubmit} onChange={() => setSaved(false)} className="space-y-6" noValidate>
            <Field label={t('displayName')} htmlFor="displayName" hint={t('displayNameHint')}>
                <Input
                    id="displayName"
                    name="displayName"
                    defaultValue={profile.displayName}
                    autoComplete="username"
                    maxLength={30}
                    required
                />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t('firstName')} htmlFor="firstName">
                    <Input id="firstName" name="firstName" defaultValue={profile.firstName ?? ''} />
                </Field>
                <Field label={t('lastName')} htmlFor="lastName">
                    <Input id="lastName" name="lastName" defaultValue={profile.lastName ?? ''} />
                </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Field label={t('birthDate')} htmlFor="birthDate">
                    <Input id="birthDate" name="birthDate" type="date" defaultValue={profile.birthDate ?? ''} />
                </Field>
                <Field label={t('sex')} htmlFor="sex">
                    <Select id="sex" name="sex" defaultValue={profile.sex ?? ''}>
                        <option value="">{t('sexUnset')}</option>
                        <option value="male">{t('sexMale')}</option>
                        <option value="female">{t('sexFemale')}</option>
                    </Select>
                </Field>
                <Field label={t('height')} htmlFor="heightCm">
                    <Input
                        id="heightCm"
                        name="heightCm"
                        type="number"
                        min={50}
                        max={300}
                        defaultValue={profile.heightCm ?? ''}
                    />
                </Field>
            </div>

            <Field label={t('bio')} htmlFor="bio">
                <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ''} placeholder={t('bioPlaceholder')} />
            </Field>

            <div className="grid gap-6 sm:grid-cols-3">
                <Field label={t('country')} htmlFor="country" hint={t('countryHint')}>
                    <Input id="country" name="country" maxLength={2} defaultValue={profile.country ?? ''} />
                </Field>
                <Field label={t('timezone')} htmlFor="timezone" hint={t('timezoneHint')}>
                    <Input id="timezone" name="timezone" defaultValue={profile.timezone ?? ''} />
                </Field>
                <Field label={t('language')}>
                    <LanguageSwitcher />
                </Field>
            </div>

            {formError ? <p className="text-sm text-ember">{formError}</p> : null}
            {saved ? <p className="text-sm text-pr">{t('saved')}</p> : null}

            <div className="max-w-xs">
                <SubmitButton analyticsId="profile-save" loading={update.isPending}>
                    {t('save')}
                </SubmitButton>
            </div>
        </form>
    )
}

export default function ProfilePage() {
    const t = useTranslations('profile')
    const { data: profile, isLoading, isError } = useMyProfile()

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-3 font-display text-display">{t('title')}</h1>
                <p className="mt-4 max-w-lg text-body text-text-dim">{t('intro')}</p>
            </TextsReveal>

            {profile ? (
                <div className="mt-10">
                    <AvatarCard profile={profile} />
                </div>
            ) : null}

            <div className="mt-6 rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-7 w-40" />
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12 w-2/3" />
                        </div>
                    ) : isError || !profile ? (
                        <p className="text-body text-ember">{t('loadError')}</p>
                    ) : (
                        <ProfileForm profile={profile} />
                    )}
                </div>
            </div>

            <div className="mt-6 space-y-6">
                <EmailVerificationCard />
                <ChangePasswordCard />
                <SessionsCard />
                <DeleteAccountCard />
            </div>
        </div>
    )
}
