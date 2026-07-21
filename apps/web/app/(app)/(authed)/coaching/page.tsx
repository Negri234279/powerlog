'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    type CoachUser,
    type PendingInvitation,
    useAcceptInvitation,
    useDeclineInvitation,
    useInviteAthlete,
    useLeaveCoach,
    useMyAthletes,
    useMyCoaches,
    usePendingInvitations,
} from '@/lib/graphql/hooks/use-coaching'
import { fullName } from '@/lib/user-name'
import { cn } from '@/lib/cn'
import { AthleteRoster, RosterSkeleton } from '@/components/coaching/roster/athlete-roster'
import { BecomeCoachModal } from '@/components/coaching/become-coach-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Users } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/** Round avatar chip: the profile image when present, else the handle initials. */
function Avatar({ username, src }: { username: string; src?: string | null }) {
    return (
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-sm uppercase text-text ring-1 ring-hairline">
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="size-full object-cover" />
            ) : (
                username.slice(0, 2)
            )}
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

/** Handle + real name (when they set one) under the avatar. */
function UserIdentity({ user }: { user: CoachUser }) {
    const name = fullName(user)

    return (
        <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-sm text-text">@{user.username}</span>
            {name ? <span className="block truncate text-xs text-text-dim">{name}</span> : null}
        </span>
    )
}

/** One of the athlete's coaches, with the option to end the relationship. */
function CoachRow({ coach }: { coach: CoachUser }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const leave = useLeaveCoach()
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function onLeave() {
        setError(null)
        leave.mutate(coach.userId, {
            onSuccess: () => setConfirming(false),
            onError: (err) => setError(errorMessage(err)),
        })
    }

    return (
        <div className="flex items-center gap-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
            <Avatar username={coach.username} src={coach.avatarUrl} />
            <UserIdentity user={coach} />
            <TrackedButton
                analyticsId="coaching-leave-coach"
                type="button"
                onClick={() => setConfirming(true)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
            >
                {t('leaveCoach')}
            </TrackedButton>

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={onLeave}
                title={t('leaveCoachTitle')}
                description={t('leaveCoachBody', { coach: coach.username })}
                confirmLabel={t('leaveCoach')}
                cancelLabel={t('cancel')}
                destructive
                pending={leave.isPending}
                error={error}
                analyticsId="coaching-leave-coach"
            />
        </div>
    )
}

function InviteForm() {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const invite = useInviteAthlete()
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState<string | null>(null)

    function onSubmit(event: SubmitEvent<HTMLFormElement>) {
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

/**
 * Become-a-coach entry point, prominence tuned to context: `hero` (glowing, full
 * section) when it's the main move on an otherwise-empty page, and `mid` (a card,
 * no glow) above "my coaches" — a deliberate growth push that stays visible without
 * a glowing CTA that would compete with accepting a pending invitation.
 */
function BecomeCoachCard({ variant = 'hero' }: { variant?: 'hero' | 'mid' }) {
    const t = useTranslations('coaching')
    const [open, setOpen] = useState(false)

    if (variant === 'mid') {
        return (
            <div className="flex flex-col items-start gap-4 rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                        <Users className="size-5" />
                    </div>
                    <div className="max-w-md">
                        <h2 className="font-display text-h4 tracking-tight">{t('becomeTitle')}</h2>
                        <p className="mt-1 text-sm text-text-dim">{t('becomeBody')}</p>
                    </div>
                </div>
                <TrackedButton
                    analyticsId="coaching-become-coach"
                    type="button"
                    onClick={() => setOpen(true)}
                    className="shrink-0 rounded-full px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:ring-ember/40"
                >
                    {t('become')}
                </TrackedButton>

                <BecomeCoachModal open={open} onClose={() => setOpen(false)} />
            </div>
        )
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
                </div>
                <TrackedButton
                    analyticsId="coaching-become-coach"
                    type="button"
                    onClick={() => setOpen(true)}
                    className="shrink-0 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    {t('become')}
                </TrackedButton>
            </div>

            <BecomeCoachModal open={open} onClose={() => setOpen(false)} />
        </SectionShell>
    )
}

/** Athlete with no coach and no pending invite: teach how a coach relationship starts. */
function NoCoachCard() {
    const t = useTranslations('coaching')

    return (
        <SectionShell>
            <SectionHeader title={t('coachEmptyTitle')} subtitle={t('coachesSubtitle')} />
            <p className="text-sm text-text-faint">{t('coachEmptyBody')}</p>
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

    // "Become a coach" is a deliberate growth push: hero on an otherwise-empty page
    // (the main move there), otherwise a mid-weight card ABOVE "my coaches" — but
    // always below a pending invitation, whose "Accept" keeps the one glowing CTA.
    const hasCoach = coachList.length > 0
    const hasPending = pending.length > 0
    const athleteNeedsCoach = !isCoach && !hasCoach && !hasPending

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
                        <RosterSkeleton />
                    ) : athleteList.length === 0 ? (
                        <p className="text-sm text-text-faint">{t('noAthletes')}</p>
                    ) : (
                        <AthleteRoster athletes={athleteList} />
                    )}
                </SectionShell>
            ) : null}

            {/* Growth push: mid-weight, above "my coaches" — but never on the empty
                page (there it's the hero below) nor above a pending invite. */}
            {!isCoach && !athleteNeedsCoach ? <BecomeCoachCard variant="mid" /> : null}

            {coachList.length > 0 ? (
                <SectionShell>
                    <SectionHeader title={t('coachesTitle')} subtitle={t('coachesSubtitle')} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {coachList.map((coach) => (
                            <CoachRow key={coach.userId} coach={coach} />
                        ))}
                    </div>
                </SectionShell>
            ) : athleteNeedsCoach ? (
                <NoCoachCard />
            ) : null}

            {athleteNeedsCoach ? <BecomeCoachCard variant="hero" /> : null}
        </div>
    )
}
