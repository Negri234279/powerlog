'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { type FormEvent, type ReactNode, useState } from 'react'

import { cn } from '@/lib/cn'
import { formatNumericDate } from '@/lib/format-date'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useAdminPlans, useAssignSubscription, useRevokeSubscription } from '@/lib/graphql/hooks/use-admin-billing'
import {
    type AdminUserDetail,
    type AdminUserSubscription,
    useAdminUserDetail,
} from '@/lib/graphql/hooks/use-admin-user-detail'
import { useSetUserAdmin, useSetUserRole, useSetUserStatus } from '@/lib/graphql/hooks/use-admin-users'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Check } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Tooltip } from '@/components/ui/tooltip'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

type Card = NonNullable<AdminUserDetail['coaching']>['coaches'][number]

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

/** Round avatar chip: the profile image when present, else the handle initials. */
function Avatar({ username, src, className }: { username: string; src?: string | null; className?: string }) {
    return (
        <span
            className={cn(
                'grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono uppercase text-text ring-1 ring-hairline',
                className ?? 'size-10 text-sm',
            )}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="size-full object-cover" />
            ) : (
                username.slice(0, 2)
            )}
        </span>
    )
}

/** One labelled section, styled like the rest of the admin surface. */
function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
            <h2 className="font-mono text-eyebrow uppercase text-text-faint">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    )
}

/** A label → value row inside a section. */
function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t border-hairline py-2 first:border-t-0 first:pt-0">
            <span className="shrink-0 text-sm text-text-dim">{label}</span>
            <span className="min-w-0 truncate text-right text-sm text-text">{children}</span>
        </div>
    )
}

/** A big number with a caption, for the training figures. */
function Stat({ value, label }: { value: number | string; label: string }) {
    return (
        <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-hairline">
            <p className="font-display text-h4 tracking-tight">{value}</p>
            <p className="mt-0.5 font-mono text-eyebrow uppercase text-text-faint">{label}</p>
        </div>
    )
}

function UserCard({ card }: { card: Card }) {
    const name = [card.firstName, card.lastName].filter(Boolean).join(' ')

    return (
        <div className="flex items-center gap-2.5">
            <Avatar username={card.username} src={card.avatarUrl} className="size-8 text-xs" />
            <div className="min-w-0">
                <p className="truncate text-sm text-text">@{card.username}</p>
                {name ? <p className="truncate text-xs text-text-faint">{name}</p> : null}
            </div>
        </div>
    )
}

/** A muted note for a section a subsystem couldn't answer, or that is empty. */
function Muted({ children }: { children: ReactNode }) {
    return <p className="text-sm text-text-faint">{children}</p>
}

export default function AdminUserDetailPage() {
    const t = useTranslations('admin')
    const locale = useLocale()
    const params = useParams<{ id: string }>()
    const userId = params.id

    const { data, isLoading } = useAdminUserDetail(userId)

    const cap = (value: number | null) => (value === null ? t('detailUnlimited') : String(value))
    const bool = (value: boolean) => (value ? t('detailYes') : t('detailNo'))
    const subStatus = (status: string) => t(`subscriptionStatusValue.${status}` as 'subscriptionStatusValue.active')

    return (
        <div>
            <TrackedLink
                analyticsId="admin-user-detail-back"
                href="/admin/users"
                className="inline-flex items-center gap-1.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
            >
                ← {t('detailBack')}
            </TrackedLink>

            {isLoading ? (
                <div className="mt-6 space-y-4">
                    <Skeleton className="h-20 rounded-2xl" />
                    <div className="grid gap-4 lg:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-48 rounded-2xl" />
                        ))}
                    </div>
                </div>
            ) : !data ? (
                <p className="mt-8 text-sm text-text-dim">{t('detailNotFound')}</p>
            ) : (
                <Detail data={data} locale={locale} cap={cap} bool={bool} subStatus={subStatus} t={t} />
            )}
        </div>
    )
}

interface DetailProps {
    data: AdminUserDetail
    locale: string
    cap: (value: number | null) => string
    bool: (value: boolean) => string
    subStatus: (status: string) => string
    t: ReturnType<typeof useTranslations<'admin'>>
}

function Detail({ data, locale, cap, bool, subStatus, t }: DetailProps) {
    const { account, profile, entitlements, billing, coaching, training } = data
    const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : ''
    const who = profile ? `@${profile.username}` : account.email

    return (
        <div className="mt-6 space-y-4">
            {/* Header: who this is, at a glance. */}
            <TextsReveal>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-hairline">
                    <Avatar
                        username={profile?.username ?? account.email}
                        src={profile?.avatarUrl}
                        className="size-14 text-base"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate font-display text-h3 tracking-tight">
                                {profile ? `@${profile.username}` : account.email}
                            </h1>
                            <Tooltip label={account.emailVerified ? t('emailVerified') : t('emailNotVerified')}>
                                {account.emailVerified ? (
                                    <Check className="size-4 shrink-0 text-pr" />
                                ) : (
                                    <span className="block size-2 shrink-0 rounded-full bg-amber" />
                                )}
                            </Tooltip>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-xs text-text-dim">{account.email}</p>
                    </div>
                    <Management account={account} who={who} />
                </div>
            </TextsReveal>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Account */}
                <Section title={t('detailAccount')}>
                    <Row label={t('detailUserId')}>
                        <span className="font-mono text-xs">{account.id}</span>
                    </Row>
                    <Row label={t('detailUnits')}>{account.units}</Row>
                    <Row label={t('detailPassword')}>
                        {account.hasPassword ? t('detailPasswordYes') : t('detailPasswordNo')}
                    </Row>
                    <Row label={t('detailCreated')}>{formatNumericDate(account.createdAt, locale)}</Row>
                    <Row label={t('detailUpdated')}>{formatNumericDate(account.updatedAt, locale)}</Row>
                </Section>

                {/* Profile */}
                <Section title={t('detailProfile')}>
                    {profile ? (
                        <>
                            <Row label={t('colUser')}>@{profile.username}</Row>
                            <Row label={t('detailName')}>{name || '—'}</Row>
                            <Row label={t('detailLocale')}>{profile.locale ?? '—'}</Row>
                        </>
                    ) : (
                        <Muted>{t('detailNoProfile')}</Muted>
                    )}
                </Section>

                {/* Plan & entitlements */}
                <Section title={t('detailPlan')}>
                    {entitlements ? (
                        <div className="space-y-5">
                            <div>
                                <p className="mb-2 font-mono text-eyebrow uppercase text-text-faint">
                                    {t('detailAthletePlan')}
                                </p>
                                <Row label="plan">
                                    <span className="font-mono text-xs">{entitlements.athlete.plan}</span>
                                </Row>
                                <Row label={t('detailMaxTemplates')}>{cap(entitlements.athlete.maxTemplates)}</Row>
                                <Row label={t('detailMaxMesocycles')}>{cap(entitlements.athlete.maxMesocycles)}</Row>
                                <Row label={t('detailMaxWorkouts')}>{cap(entitlements.athlete.maxWorkouts)}</Row>
                                <Row label={t('detailAi')}>{bool(entitlements.athlete.ai)}</Row>
                            </div>
                            {entitlements.coach ? (
                                <div>
                                    <p className="mb-2 font-mono text-eyebrow uppercase text-text-faint">
                                        {t('detailCoachPlan')}
                                    </p>
                                    <Row label="plan">
                                        <span className="font-mono text-xs">{entitlements.coach.plan}</span>
                                    </Row>
                                    <Row label={t('detailMaxAthletes')}>{cap(entitlements.coach.maxAthletes)}</Row>
                                    <Row label={t('detailMaxTemplates')}>{cap(entitlements.coach.maxTemplates)}</Row>
                                    <Row label={t('detailMaxMesocycles')}>{cap(entitlements.coach.maxMesocycles)}</Row>
                                    <Row label={t('detailPlanSessions')}>{bool(entitlements.coach.planSessions)}</Row>
                                    <Row label={t('detailAi')}>{bool(entitlements.coach.ai)}</Row>
                                </div>
                            ) : (
                                <Muted>{t('detailNoCoachPlan')}</Muted>
                            )}
                        </div>
                    ) : (
                        <Muted>{t('detailPlanUnavailable')}</Muted>
                    )}
                </Section>

                {/* Billing */}
                <Section title={t('detailBilling')}>
                    {billing ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-display text-h3 tracking-tight text-ember">
                                        {billing.currency
                                            ? formatAmount(billing.mrrCents, billing.currency)
                                            : formatAmount(billing.mrrCents, 'EUR')}
                                    </span>
                                    <span className="font-mono text-eyebrow uppercase text-text-faint">
                                        {t('detailMrr')}
                                    </span>
                                </div>
                                <AssignButton userId={account.id} />
                            </div>
                            {billing.subscriptions.length ? (
                                <div className="space-y-2">
                                    {billing.subscriptions.map((sub) => (
                                        <SubscriptionLine
                                            key={sub.id}
                                            sub={sub}
                                            locale={locale}
                                            subStatus={subStatus}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Muted>{t('detailNoSubscriptions')}</Muted>
                            )}
                        </div>
                    ) : (
                        <Muted>{t('detailBillingUnavailable')}</Muted>
                    )}
                </Section>

                {/* Coaching */}
                <Section title={t('detailCoaching')}>
                    {coaching ? (
                        <div className="space-y-5">
                            <div>
                                <p className="mb-2 font-mono text-eyebrow uppercase text-text-faint">
                                    {t('detailCoaches')}
                                </p>
                                {coaching.coaches.length ? (
                                    <div className="space-y-2">
                                        {coaching.coaches.map((c) => (
                                            <UserCard key={c.userId} card={c} />
                                        ))}
                                    </div>
                                ) : (
                                    <Muted>{t('detailNoCoaches')}</Muted>
                                )}
                            </div>
                            <div>
                                <p className="mb-2 font-mono text-eyebrow uppercase text-text-faint">
                                    {t('detailAthletes')} ({coaching.athleteCount})
                                </p>
                                {coaching.athletes.length ? (
                                    <div className="space-y-2">
                                        {coaching.athletes.map((a) => (
                                            <UserCard key={a.userId} card={a} />
                                        ))}
                                        {coaching.athleteCount > coaching.athletes.length ? (
                                            <Muted>
                                                {t('detailAndMore', {
                                                    count: coaching.athleteCount - coaching.athletes.length,
                                                })}
                                            </Muted>
                                        ) : null}
                                    </div>
                                ) : (
                                    <Muted>{t('detailNoAthletes')}</Muted>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Muted>{t('detailCoachingUnavailable')}</Muted>
                    )}
                </Section>

                {/* Training */}
                <Section title={t('detailTraining')}>
                    {training ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Stat value={training.sessions} label={t('detailSessions')} />
                            <Stat value={training.completedSessions} label={t('detailCompleted')} />
                            <Stat value={training.sets} label={t('detailSets')} />
                            <Stat value={training.distinctExercises} label={t('detailExercises')} />
                            <Stat value={training.sessionsLast30Days} label={t('detailLast30')} />
                            <Stat
                                value={
                                    training.lastSessionAt
                                        ? formatNumericDate(training.lastSessionAt, locale)
                                        : t('detailNever')
                                }
                                label={t('detailLastSession')}
                            />
                        </div>
                    ) : (
                        <Muted>{t('detailTrainingUnavailable')}</Muted>
                    )}
                </Section>
            </div>
        </div>
    )
}

function Badge({ tone, children }: { tone: 'neutral' | 'pr' | 'amber' | 'ember'; children: ReactNode }) {
    const tones = {
        neutral: 'text-text-dim ring-hairline',
        pr: 'bg-pr/10 text-pr ring-pr/30',
        amber: 'bg-amber/10 text-amber ring-amber/30',
        ember: 'bg-ember/10 text-ember ring-ember/30',
    } as const

    return <span className={cn('rounded-full px-2.5 py-0.5 text-xs ring-1', tones[tone])}>{children}</span>
}

function SubscriptionLine({
    sub,
    locale,
    subStatus,
    t,
}: {
    sub: AdminUserSubscription
    locale: string
    subStatus: (status: string) => string
    t: ReturnType<typeof useTranslations<'admin'>>
}) {
    const toMessage = useErrorMessage()
    const revoke = useRevokeSubscription()
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    return (
        <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-hairline">
            <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-text">{sub.planName}</p>
                <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-eyebrow uppercase text-text-dim">{subStatus(sub.status)}</span>
                    {/* Only a comp can be ended here: one a gateway is billing must be
                        ended at the gateway, or the card would keep being charged. */}
                    {sub.gateway === 'manual' ? (
                        <TrackedButton
                            analyticsId="admin-user-detail-revoke-open"
                            type="button"
                            onClick={() => setConfirming(true)}
                            className="rounded-full px-2.5 py-0.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-ember hover:ring-ember/40"
                        >
                            {t('subscriptionRevoke')}
                        </TrackedButton>
                    ) : null}
                </div>
            </div>
            <p className="mt-0.5 font-mono text-xs text-text-faint">
                {sub.gateway}
                <span className="mx-1.5">·</span>
                {sub.amountCents !== null && sub.currency
                    ? formatAmount(sub.amountCents, sub.currency)
                    : t('subscriptionNoCharge')}
                <span className="mx-1.5">·</span>
                {sub.cancelAtPeriodEnd ? t('subscriptionEndsOn') : t('subscriptionRenewsOn')}{' '}
                {formatNumericDate(sub.currentPeriodEnd, locale)}
            </p>

            <FormError error={error} />

            <ConfirmModal
                analyticsId="admin-user-detail-revoke"
                open={confirming}
                onClose={() => {
                    setError(null)
                    setConfirming(false)
                }}
                onConfirm={() =>
                    revoke.mutate(sub.id, {
                        onSuccess: () => setConfirming(false),
                        onError: (err) => setError(toMessage(err)),
                    })
                }
                title={t('subscriptionRevokeTitle')}
                description={t('subscriptionRevokeBody')}
                confirmLabel={t('subscriptionRevoke')}
                cancelLabel={t('cancel')}
                destructive
                pending={revoke.isPending}
            />
        </div>
    )
}

/** Grant/revoke admin, disable/enable, and change role — for another user only. */
function Management({ account, who }: { account: AdminUserDetail['account']; who: string }) {
    const t = useTranslations('admin')
    const tRole = useTranslations('common.role')
    const { data: me } = useMe()
    const errorMessage = useErrorMessage()
    const setRole = useSetUserRole()
    const setAdmin = useSetUserAdmin()
    const setStatus = useSetUserStatus()

    const [error, setError] = useState<string | null>(null)
    const [adminTarget, setAdminTarget] = useState<{ next: boolean } | null>(null)
    const [statusTarget, setStatusTarget] = useState<{ disable: boolean } | null>(null)

    const isSelf = account.id === me?.id
    const deleted = account.status === 'deleted'

    async function changeRole(role: string) {
        setError(null)
        try {
            await setRole.mutateAsync({ userId: account.id, role })
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    async function confirmAdmin() {
        if (!adminTarget) return
        setError(null)
        try {
            await setAdmin.mutateAsync({ userId: account.id, isAdmin: adminTarget.next })
            setAdminTarget(null)
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    async function confirmStatus() {
        if (!statusTarget) return
        setError(null)
        try {
            await setStatus.mutateAsync({ userId: account.id, disabled: statusTarget.disable })
            setStatusTarget(null)
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    const adminButton = (
        <TrackedButton
            analyticsId="admin-user-detail-admin-toggle"
            type="button"
            disabled={isSelf && account.isAdmin}
            onClick={() => setAdminTarget({ next: !account.isAdmin })}
            className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-xs ring-1 transition-colors duration-300 disabled:opacity-40',
                account.isAdmin
                    ? 'bg-ember/10 text-ember ring-ember/30 hover:bg-ember/20'
                    : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
            )}
        >
            {account.isAdmin ? t('admin') : t('makeAdmin')}
        </TrackedButton>
    )

    const statusButton = (
        <TrackedButton
            analyticsId="admin-user-detail-status-toggle"
            type="button"
            disabled={isSelf}
            onClick={() => setStatusTarget({ disable: account.status === 'active' })}
            className={cn(
                'rounded-full px-3 py-1 text-xs ring-1 transition-colors duration-300 disabled:opacity-40',
                account.status === 'active'
                    ? 'bg-pr/10 text-pr ring-pr/30 hover:bg-pr/20'
                    : 'bg-amber/10 text-amber ring-amber/30 hover:bg-amber/20',
            )}
        >
            {account.status === 'active' ? t('statusActive') : t('statusDisabled')}
        </TrackedButton>
    )

    return (
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={account.role}
                    disabled={deleted}
                    onChange={(e) => changeRole(e.target.value)}
                    className="w-28 py-1.5 text-xs"
                >
                    <option value="athlete">{tRole('athlete')}</option>
                    <option value="coach">{tRole('coach')}</option>
                </Select>

                {deleted ? (
                    <Badge tone="neutral">{t('statusDeleted')}</Badge>
                ) : isSelf ? (
                    <Tooltip label={t('cantDisableSelf')}>{statusButton}</Tooltip>
                ) : (
                    statusButton
                )}

                {isSelf && account.isAdmin ? <Tooltip label={t('cantRevokeSelf')}>{adminButton}</Tooltip> : adminButton}
            </div>

            <FormError error={error} />

            <ConfirmModal
                analyticsId="admin-user-detail-admin"
                open={adminTarget != null}
                onClose={() => {
                    setError(null)
                    setAdminTarget(null)
                }}
                onConfirm={confirmAdmin}
                title={adminTarget?.next ? t('grantTitle') : t('revokeTitle')}
                description={
                    adminTarget ? (adminTarget.next ? t('grantBody', { who }) : t('revokeBody', { who })) : undefined
                }
                confirmLabel={adminTarget?.next ? t('grant') : t('revoke')}
                destructive={!adminTarget?.next}
                pending={setAdmin.isPending}
                error={error}
            />

            <ConfirmModal
                analyticsId="admin-user-detail-status"
                open={statusTarget != null}
                onClose={() => {
                    setError(null)
                    setStatusTarget(null)
                }}
                onConfirm={confirmStatus}
                title={statusTarget?.disable ? t('disableTitle') : t('enableTitle')}
                description={
                    statusTarget
                        ? statusTarget.disable
                            ? t('disableBody', { who })
                            : t('enableBody', { who })
                        : undefined
                }
                confirmLabel={statusTarget?.disable ? t('disable') : t('enable')}
                destructive={statusTarget?.disable}
                pending={setStatus.isPending}
                error={error}
            />
        </div>
    )
}

/** Grant a plan to this user by hand (comp/support): pick a plan, optionally an end date. */
function AssignButton({ userId }: { userId: string }) {
    const t = useTranslations('admin')
    const [open, setOpen] = useState(false)

    return (
        <>
            <TrackedButton
                analyticsId="admin-user-detail-assign-open"
                type="button"
                onClick={() => setOpen(true)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text hover:ring-ember/40"
            >
                {t('subscriptionAssign')}
            </TrackedButton>
            {open ? <AssignModal userId={userId} onClose={() => setOpen(false)} /> : null}
        </>
    )
}

function AssignModal({ userId, onClose }: { userId: string; onClose: () => void }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const assign = useAssignSubscription()
    const { data: plans } = useAdminPlans()

    const [planId, setPlanId] = useState('')
    const [until, setUntil] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Only a plan that takes signups can be granted; a draft is not a plan yet.
    const grantable = plans?.filter((plan) => plan.status === 'active' && !plan.isFree) ?? []

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        assign.mutate(
            { userId, planId, until: until ? new Date(until).toISOString() : null },
            { onSuccess: onClose, onError: (err) => setError(toMessage(err)) },
        )
    }

    return (
        <Modal open onClose={onClose} className="max-w-md">
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <h2 className="font-display text-h4 tracking-tight">{t('subscriptionAssignTitle')}</h2>
                    <p className="mt-1 text-xs text-text-faint">{t('subscriptionAssignHint')}</p>
                </div>

                <Field label={t('subscriptionAssignPlan')}>
                    <Select value={planId} onChange={(event) => setPlanId(event.target.value)} required>
                        <option value="" disabled>
                            {t('subscriptionAssignPlanPlaceholder')}
                        </option>
                        {grantable.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} ({plan.slug})
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label={t('subscriptionAssignUntil')} hint={t('subscriptionAssignUntilHint')}>
                    <Input type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
                </Field>

                <FormError error={error} />

                <div className="flex gap-2">
                    <TrackedButton
                        analyticsId="admin-user-detail-assign-cancel"
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                    >
                        {t('cancel')}
                    </TrackedButton>
                    <SubmitButton analyticsId="admin-user-detail-assign" loading={assign.isPending} disabled={!planId}>
                        {t('subscriptionAssign')}
                    </SubmitButton>
                </div>
            </form>
        </Modal>
    )
}
