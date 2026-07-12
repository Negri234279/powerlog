'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    type CoachUser,
    type PendingInvitation,
    useAcceptInvitation,
    useBecomeCoach,
    useDeclineInvitation,
    useInviteAthlete,
    useMyAthletes,
    useMyCoaches,
    usePendingInvitations,
} from '@/lib/graphql/hooks/use-coaching'
import { cn } from '@/lib/cn'
import { FormError } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Users } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/** Round initials chip from a handle. */
function Avatar({ username }: { username: string }) {
    return (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] font-mono text-sm uppercase text-text ring-1 ring-hairline">
            {username.slice(0, 2)}
        </span>
    )
}

function SectionShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">{children}</div>
        </div>
    )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-5">
            <h2 className="font-display text-h3">{title}</h2>
            <p className="mt-1 text-sm text-text-dim">{subtitle}</p>
        </div>
    )
}

function InvitationCard({ invitation }: { invitation: PendingInvitation }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const accept = useAcceptInvitation()
    const decline = useDeclineInvitation()
    const [error, setError] = useState<string | null>(null)

    const pending = accept.isPending || decline.isPending

    function onAccept() {
        setError(null)
        accept.mutate(invitation.id, { onError: (err) => setError(errorMessage(err)) })
    }

    function onDecline() {
        setError(null)
        decline.mutate(invitation.id, { onError: (err) => setError(errorMessage(err)) })
    }

    return (
        <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar username={invitation.coachUsername} />
                    <div className="min-w-0">
                        <p className="truncate text-text">{t('invitedBy', { coach: invitation.coachUsername })}</p>
                        <p className="font-mono text-xs text-text-faint">@{invitation.coachUsername}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <TrackedButton
                        analyticsId="coaching-invitation-accept"
                        type="button"
                        disabled={pending}
                        onClick={onAccept}
                        className="rounded-full bg-ember-gradient px-4 py-2 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                    >
                        {t('accept')}
                    </TrackedButton>
                    <TrackedButton
                        analyticsId="coaching-invitation-decline"
                        type="button"
                        disabled={pending}
                        onClick={onDecline}
                        className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                    >
                        {t('decline')}
                    </TrackedButton>
                </div>
            </div>
            <FormError error={error} className="mt-3" />
        </div>
    )
}

function UserRow({ user, href }: { user: CoachUser; href?: string }) {
    const base = 'flex items-center gap-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline'
    const content = (
        <>
            <Avatar username={user.username} />
            <p className="truncate font-mono text-sm text-text">@{user.username}</p>
        </>
    )

    return href ? (
        <TrackedLink
            analyticsId="coaching-athlete-open"
            href={href}
            className={cn(base, 'transition-all duration-300 hover:ring-text/20')}
        >
            {content}
        </TrackedLink>
    ) : (
        <div className={base}>{content}</div>
    )
}

function InviteForm() {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const invite = useInviteAthlete()
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState<string | null>(null)

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const value = email.trim()
        if (value === '') return

        setError(null)
        setSent(null)
        invite.mutate(value, {
            onSuccess: () => {
                setSent(value)
                setEmail('')
            },
            onError: (err) => setError(errorMessage(err)),
        })
    }

    return (
        <form onSubmit={onSubmit} className="mb-6">
            <p className="mb-2 text-sm text-text-dim">{t('inviteHint')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('inviteEmailPlaceholder')}
                    aria-label={t('inviteTitle')}
                    className="w-full rounded-full bg-bg/60 px-4 py-2.5 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50 sm:max-w-xs"
                />
                <TrackedButton
                    analyticsId="coaching-invite-submit"
                    type="submit"
                    disabled={invite.isPending || email.trim() === ''}
                    className="rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                >
                    {t('invite')}
                </TrackedButton>
            </div>
            {sent ? <p className="mt-2 text-sm text-pr">{t('inviteSent', { athlete: sent })}</p> : null}
            <FormError error={error} className="mt-2" />
        </form>
    )
}

function BecomeCoachCard() {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const become = useBecomeCoach()
    const [error, setError] = useState<string | null>(null)

    function onBecome() {
        setError(null)
        become.mutate(undefined, { onError: (err) => setError(errorMessage(err)) })
    }

    return (
        <SectionShell>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-lg">
                    <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                        <Users className="size-5" />
                    </div>
                    <h2 className="font-display text-h3">{t('becomeTitle')}</h2>
                    <p className="mt-2 text-body text-text-dim">{t('becomeBody')}</p>
                    <FormError error={error} className="mt-3" />
                </div>
                <TrackedButton
                    analyticsId="coaching-become-coach"
                    type="button"
                    disabled={become.isPending}
                    onClick={onBecome}
                    className="shrink-0 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                    {t('become')}
                </TrackedButton>
            </div>
        </SectionShell>
    )
}

export default function CoachingPage() {
    const t = useTranslations('coaching')
    const { data: me } = useMe()
    const isCoach = me?.role === 'coach'

    const invitations = usePendingInvitations()
    const coaches = useMyCoaches()
    const athletes = useMyAthletes(isCoach)

    const pending = invitations.data ?? []
    const coachList = coaches.data ?? []
    const athleteList = athletes.data ?? []

    return (
        <div className="space-y-6">
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-3 font-display text-display">{t('title')}</h1>
            </TextsReveal>

            {pending.length > 0 ? (
                <SectionShell>
                    <SectionHeader title={t('invitationsTitle')} subtitle={t('invitationsSubtitle')} />
                    <div className="space-y-3">
                        {pending.map((invitation) => (
                            <InvitationCard key={invitation.id} invitation={invitation} />
                        ))}
                    </div>
                </SectionShell>
            ) : null}

            {isCoach ? (
                <SectionShell>
                    <SectionHeader title={t('athletesTitle')} subtitle={t('athletesSubtitle')} />
                    <InviteForm />
                    {athletes.isLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
                            ))}
                        </div>
                    ) : athleteList.length === 0 ? (
                        <p className="text-sm text-text-faint">{t('noAthletes')}</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {athleteList.map((athlete) => (
                                <UserRow
                                    key={athlete.userId}
                                    user={athlete}
                                    href={`/coaching/athletes/${athlete.userId}`}
                                />
                            ))}
                        </div>
                    )}
                </SectionShell>
            ) : null}

            {coachList.length > 0 ? (
                <SectionShell>
                    <SectionHeader title={t('coachesTitle')} subtitle={t('coachesSubtitle')} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {coachList.map((coach) => (
                            <UserRow key={coach.userId} user={coach} />
                        ))}
                    </div>
                </SectionShell>
            ) : null}

            {!isCoach ? <BecomeCoachCard /> : null}
        </div>
    )
}
