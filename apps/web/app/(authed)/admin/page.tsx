'use client'

import { useTranslations } from 'next-intl'

import { env } from '@/lib/env'
import { useAdminStats } from '@/lib/graphql/hooks/use-admin-stats'
import { ArrowUpRight, ChartLine, Dumbbell, Shield, Users } from '@/components/ui/icons'
import { PopNumber } from '@/components/ui/pop-number'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TiltCard } from '@/components/ui/tilt-card'
import { TrackedLink } from '@/components/ui/tracked'
import { AdminTabs } from '@/components/admin/admin-tabs'

export default function AdminOverviewPage() {
    const t = useTranslations('admin')
    const { data, isLoading } = useAdminStats()
    const users = data?.adminUserStats
    const coaching = data?.adminCoachingStats
    const workouts = data?.adminWorkoutStats

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('overviewTitle')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="space-y-10">
                    <Section title={t('sectionUsers')} icon={<Users className="size-4" />}>
                        <Stat label={t('usersTotal')} value={users?.total} />
                        <Stat label={t('usersAthletes')} value={users?.athletes} />
                        <Stat label={t('usersCoaches')} value={users?.coaches} />
                        <Stat label={t('usersAdmins')} value={users?.admins} />
                        <Stat label={t('usersVerified')} value={users?.verified} />
                        <Stat label={t('usersNew7')} value={users?.newLast7Days} />
                        <Stat label={t('usersNew30')} value={users?.newLast30Days} />
                        <Stat label={t('usersDisabled')} value={users?.disabled} />
                    </Section>

                    <Section title={t('sectionCoaching')} icon={<Shield className="size-4" />}>
                        <Stat label={t('coachingLinks')} value={coaching?.links} />
                        <Stat label={t('coachingActiveCoaches')} value={coaching?.activeCoaches} />
                        <Stat label={t('coachingLinkedAthletes')} value={coaching?.linkedAthletes} />
                        <Stat label={t('coachingPending')} value={coaching?.pendingInvitations} />
                    </Section>

                    <Section title={t('sectionTraining')} icon={<Dumbbell className="size-4" />}>
                        <Stat label={t('trainingSessions')} value={workouts?.sessions} />
                        <Stat label={t('trainingCompleted')} value={workouts?.completedSessions} />
                        <Stat label={t('trainingSets')} value={workouts?.sets} />
                        <Stat label={t('trainingCatalog')} value={workouts?.exercises} />
                        <Stat label={t('trainingSessions7')} value={workouts?.sessionsLast7Days} />
                        <Stat label={t('trainingActiveUsers')} value={workouts?.activeUsers} />
                    </Section>

                    <ExternalDashboards />
                </div>
            )}
        </div>
    )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="flex items-center gap-2 font-mono text-eyebrow uppercase text-text-dim">
                <span className="text-text-faint">{icon}</span>
                {title}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
        </section>
    )
}

function Stat({ label, value }: { label: string; value?: number }) {
    return (
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
            <p className="font-mono text-eyebrow uppercase text-text-faint">{label}</p>
            <p className="mt-2 font-display text-h3 tabular-nums tracking-tight">
                <PopNumber value={value ?? '—'} />
            </p>
        </div>
    )
}

function ExternalDashboards() {
    const t = useTranslations('admin')
    // Grafana now owns ALL web telemetry (RUM + events via Faro, logs, traces,
    // metrics) — it's the single external dashboard.
    const links = [{ label: 'Grafana', description: t('grafanaDesc'), href: env.grafanaUrl }].filter(
        (l): l is { label: string; description: string; href: string } => Boolean(l.href),
    )

    if (links.length === 0) return null

    return (
        <section>
            <h2 className="font-mono text-eyebrow uppercase text-text-dim">{t('externalDashboards')}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {links.map((link) => (
                    <TiltCard key={link.label} cardClassName="rounded-2xl">
                        <TrackedLink
                            analyticsId={`admin-dashboard-${link.label.toLowerCase()}`}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between rounded-2xl bg-surface p-5 ring-1 ring-hairline transition-colors duration-300 hover:ring-text/30"
                        >
                            <div>
                                <ChartLine className="size-5 text-ember" />
                                <p className="mt-3 font-display text-h3 tracking-tight">{link.label}</p>
                                <p className="text-sm text-text-dim">{link.description}</p>
                            </div>
                            <ArrowUpRight className="size-5 text-text-faint transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:text-text" />
                        </TrackedLink>
                    </TiltCard>
                ))}
            </div>
        </section>
    )
}
