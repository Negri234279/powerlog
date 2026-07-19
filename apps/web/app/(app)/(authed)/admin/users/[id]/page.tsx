'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { formatNumericDate } from '@/lib/format-date'
import {
    type AdminUserDetail,
    type AdminUserSubscription,
    useAdminUserDetail,
} from '@/lib/graphql/hooks/use-admin-user-detail'
import { Check } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Tooltip } from '@/components/ui/tooltip'
import { TrackedLink } from '@/components/ui/tracked'

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
    const tRole = useTranslations('common.role')
    const locale = useLocale()
    const params = useParams<{ id: string }>()
    const userId = params.id

    const { data, isLoading } = useAdminUserDetail(userId)

    const statusLabel = (status: string) =>
        status === 'active' ? t('statusActive') : status === 'disabled' ? t('statusDisabled') : t('statusDeleted')

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
                <Detail
                    data={data}
                    locale={locale}
                    statusLabel={statusLabel}
                    roleLabel={(role) => tRole(role as 'athlete')}
                    cap={cap}
                    bool={bool}
                    subStatus={subStatus}
                    t={t}
                />
            )}
        </div>
    )
}

interface DetailProps {
    data: AdminUserDetail
    locale: string
    statusLabel: (status: string) => string
    roleLabel: (role: string) => string
    cap: (value: number | null) => string
    bool: (value: boolean) => string
    subStatus: (status: string) => string
    t: ReturnType<typeof useTranslations<'admin'>>
}

function Detail({ data, locale, statusLabel, roleLabel, cap, bool, subStatus, t }: DetailProps) {
    const { account, profile, entitlements, billing, coaching, training } = data
    const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : ''

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
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{roleLabel(account.role)}</Badge>
                        <Badge tone={account.status === 'active' ? 'pr' : 'amber'}>{statusLabel(account.status)}</Badge>
                        {account.isAdmin ? <Badge tone="ember">{t('admin')}</Badge> : null}
                    </div>
                </div>
            </TextsReveal>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Account */}
                <Section title={t('detailAccount')}>
                    <Row label={t('detailUserId')}>
                        <span className="font-mono text-xs">{account.id}</span>
                    </Row>
                    <Row label={t('colRole')}>{roleLabel(account.role)}</Row>
                    <Row label={t('colStatus')}>{statusLabel(account.status)}</Row>
                    <Row label={t('colAdmin')}>{bool(account.isAdmin)}</Row>
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
    return (
        <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-hairline">
            <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-text">{sub.planName}</p>
                <span className="shrink-0 font-mono text-eyebrow uppercase text-text-dim">{subStatus(sub.status)}</span>
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
        </div>
    )
}
