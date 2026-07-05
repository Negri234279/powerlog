'use client'

import { type FormEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { AvatarCard } from '@/components/profile/avatar-card'
import { ChangePasswordCard } from '@/components/auth/change-password-card'
import { DeleteAccountCard } from '@/components/auth/delete-account-card'
import { EmailVerificationCard } from '@/components/auth/email-verification-card'
import { SessionsCard } from '@/components/auth/sessions-card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { type ProfileData, useMyProfile, useUpdateProfile } from '@/lib/graphql/hooks/use-profile'

/** Empty string → null (clear the field); trimmed value otherwise. */
function nullify(value: FormDataEntryValue | null): string | null {
    const v = String(value ?? '').trim()
    return v === '' ? null : v
}

function ProfileForm({ profile }: { profile: ProfileData }) {
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
                locale: nullify(data.get('locale')),
            })
            track('profile_updated', {})
            setSaved(true)
        } catch (error) {
            setFormError(gqlErrorMessage(error))
        }
    }

    return (
        <form onSubmit={onSubmit} onChange={() => setSaved(false)} className="space-y-6" noValidate>
            <Field
                label="Display name"
                htmlFor="displayName"
                hint="Your public handle (= username) · a–z, 0–9, _ · 3–30"
            >
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
                <Field label="First name" htmlFor="firstName">
                    <Input id="firstName" name="firstName" defaultValue={profile.firstName ?? ''} />
                </Field>
                <Field label="Last name" htmlFor="lastName">
                    <Input id="lastName" name="lastName" defaultValue={profile.lastName ?? ''} />
                </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Field label="Birth date" htmlFor="birthDate">
                    <Input id="birthDate" name="birthDate" type="date" defaultValue={profile.birthDate ?? ''} />
                </Field>
                <Field label="Sex" htmlFor="sex">
                    <Select id="sex" name="sex" defaultValue={profile.sex ?? ''}>
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </Select>
                </Field>
                <Field label="Height (cm)" htmlFor="heightCm">
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

            <Field label="Bio" htmlFor="bio">
                <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ''} placeholder="Squatting since…" />
            </Field>

            <div className="grid gap-6 sm:grid-cols-3">
                <Field label="Country" htmlFor="country" hint="2-letter code, e.g. ES">
                    <Input id="country" name="country" maxLength={2} defaultValue={profile.country ?? ''} />
                </Field>
                <Field label="Timezone" htmlFor="timezone" hint="e.g. Europe/Madrid">
                    <Input id="timezone" name="timezone" defaultValue={profile.timezone ?? ''} />
                </Field>
                <Field label="Locale" htmlFor="locale" hint="e.g. es-ES">
                    <Input id="locale" name="locale" defaultValue={profile.locale ?? ''} />
                </Field>
            </div>

            {formError ? <p className="text-sm text-ember">{formError}</p> : null}
            {saved ? <p className="text-sm text-pr">Profile saved.</p> : null}

            <div className="max-w-xs">
                <SubmitButton analyticsId="profile-save" loading={update.isPending}>
                    Save profile
                </SubmitButton>
            </div>
        </form>
    )
}

export default function ProfilePage() {
    const { data: profile, isLoading, isError } = useMyProfile()

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">Account</p>
                <h1 className="mt-3 font-display text-display">Your profile</h1>
                <p className="mt-4 max-w-lg text-body text-text-dim">
                    This shapes how analytics and coaching read your training. Everything here is optional except your
                    display name.
                </p>
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
                        <p className="text-body text-ember">Couldn&rsquo;t load your profile. Try refreshing.</p>
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
