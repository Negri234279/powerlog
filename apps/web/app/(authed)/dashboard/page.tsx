'use client'

import { useRouter } from 'next/navigation'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useTrainingSummary, useWorkoutHistory, type WorkoutHistoryItem } from '@/lib/graphql/hooks/use-workouts'
import {
    type WorkoutTemplateSummary,
    useCreateSessionFromTemplate,
    useWorkoutTemplates,
} from '@/lib/graphql/hooks/use-workout-templates'
import { formatWeight, type Units, unitsOf } from '@/lib/units'
import { FormError } from '@/components/ui/form-error'
import { Calendar, ChartLine, Check, Dumbbell, Plus, Target } from '@/components/ui/icons'
import { PlusMenuMorph } from '@/components/ui/plus-menu-morph'
import { Skeleton } from '@/components/ui/skeleton'
import { TextSwap } from '@/components/ui/text-swap'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { useState } from 'react'

// ── helpers ──────────────────────────────────────────────────

/** Whole-day UTC bounds for the current week (Mon–Sun), matching how the app
 *  stores dated sessions (noon UTC), so the range captures them. */
function currentWeekRange(): { from: string; to: string } {
    const now = new Date()
    const daysSinceMonday = (now.getDay() + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysSinceMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const iso = (d: Date, end: boolean): string => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}T${end ? '23:59:59.999' : '00:00:00.000'}Z`
    }

    return { from: iso(monday, false), to: iso(sunday, true) }
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function StatusBadge({ status }: { status: string }) {
    const completed = status === 'completed'
    return (
        <span
            className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest',
                completed ? 'bg-pr/10 text-pr' : 'bg-ember/10 text-ember',
            )}
        >
            {completed ? 'Completed' : 'Planned'}
        </span>
    )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline', className)}>
            <div className="inset-hi flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-7">
                {children}
            </div>
        </div>
    )
}

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-h3 tracking-tight">{title}</h2>
            {action}
        </div>
    )
}

// ── This week: KPIs + planned sessions ───────────────────────

function WeekStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="font-mono text-lg tabular-nums text-text">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">{label}</p>
        </div>
    )
}

function WeekCard({ units }: { units: Units }) {
    const week = currentWeekRange()
    const { data: summary, isLoading: loadingSummary } = useTrainingSummary(week.from, week.to)
    const { data, isLoading: loadingPlanned } = useWorkoutHistory({ status: 'planned', from: week.from, to: week.to })
    const planned = data?.pages.flatMap((p) => p.items) ?? []

    return (
        <Panel className="md:col-span-2">
            <PanelHeader
                title="This week"
                action={
                    <TrackedLink
                        analyticsId="dashboard-all-workouts"
                        href="/workouts"
                        className="rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        All workouts
                    </TrackedLink>
                }
            />

            {loadingSummary ? (
                <Skeleton className="mt-5 h-12 rounded-xl" />
            ) : (
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <WeekStat label="Sessions" value={summary?.sessions ?? 0} />
                    <WeekStat label="Days" value={summary?.trainingDays ?? 0} />
                    <WeekStat label="Sets" value={summary?.totalSets ?? 0} />
                    <WeekStat label="Volume" value={formatWeight(summary?.totalVolumeKg ?? 0, units)} />
                </div>
            )}

            <div className="mt-6 border-t border-hairline pt-5">
                <p className="font-mono text-eyebrow uppercase text-text-faint">Planned this week</p>
                {loadingPlanned ? (
                    <div className="mt-3 space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 rounded-xl" />
                        ))}
                    </div>
                ) : planned.length === 0 ? (
                    <p className="mt-3 text-sm text-text-dim">
                        Nothing planned for this week.{' '}
                        <TrackedLink
                            analyticsId="dashboard-plan-session"
                            href="/workouts"
                            className="text-text underline-offset-4 hover:underline"
                        >
                            Plan a session
                        </TrackedLink>
                        .
                    </p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {planned.map((session) => (
                            <li key={session.id}>
                                <TrackedLink
                                    analyticsId="dashboard-planned-session-open"
                                    href={`/workouts/${session.id}`}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-bg/40 px-3.5 py-2.5 ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04]"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Calendar className="size-4 text-text-faint" />
                                        <span className="text-sm text-text">{formatDate(session.performedAt)}</span>
                                        <StatusBadge status={session.status} />
                                    </span>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                        {session.exerciseCount} ex · {session.setCount} sets
                                    </span>
                                </TrackedLink>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Panel>
    )
}

// ── Strength snapshot ────────────────────────────────────────

function StrengthRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-t border-hairline py-2.5 first:border-t-0">
            <span className="text-sm text-text-dim">{label}</span>
            <span className="font-mono text-sm tabular-nums text-text">{value}</span>
        </div>
    )
}

function StrengthCard({ units }: { units: Units }) {
    const { data: summary, isLoading } = useTrainingSummary()
    const hasAny =
        summary != null &&
        (summary.bestSquatE1rmKg != null || summary.bestBenchE1rmKg != null || summary.bestDeadliftE1rmKg != null)

    return (
        <Panel>
            <PanelHeader
                title="Strength"
                action={
                    <TrackedLink
                        analyticsId="dashboard-analytics"
                        href="/workouts/stats"
                        aria-label="Analytics"
                        className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
                    >
                        <ChartLine className="size-4" />
                    </TrackedLink>
                }
            />

            {isLoading ? (
                <Skeleton className="mt-5 h-32 rounded-xl" />
            ) : !hasAny ? (
                <p className="mt-5 flex-1 text-sm text-text-dim">
                    Log a few sets and your estimated 1RMs for the big three will show up here.
                </p>
            ) : (
                <>
                    <div className="mt-5">
                        <p className="font-mono text-eyebrow uppercase text-text-faint">Estimated total</p>
                        <p className="mt-1 font-display text-h2 tracking-tight">
                            {formatWeight(summary?.estimatedTotalKg ?? 0, units)}
                        </p>
                    </div>
                    <div className="mt-4">
                        <StrengthRow label="Squat e1RM" value={formatWeight(summary?.bestSquatE1rmKg, units)} />
                        <StrengthRow label="Bench e1RM" value={formatWeight(summary?.bestBenchE1rmKg, units)} />
                        <StrengthRow label="Deadlift e1RM" value={formatWeight(summary?.bestDeadliftE1rmKg, units)} />
                    </div>
                </>
            )}
        </Panel>
    )
}

// ── Recent sessions ──────────────────────────────────────────

function RecentCard({ units }: { units: Units }) {
    const { data, isLoading } = useWorkoutHistory({ limit: 5 })
    const sessions: WorkoutHistoryItem[] = data?.pages.flatMap((p) => p.items) ?? []

    return (
        <Panel>
            <PanelHeader
                title="Recent sessions"
                action={
                    <TrackedLink
                        analyticsId="dashboard-recent-view-all"
                        href="/workouts"
                        className="rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        View all
                    </TrackedLink>
                }
            />

            {isLoading ? (
                <div className="mt-5 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl" />
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <p className="mt-5 flex-1 text-sm text-text-dim">No sessions yet — your history will build here.</p>
            ) : (
                <ul className="mt-5 space-y-2">
                    {sessions.map((session) => (
                        <li key={session.id}>
                            <TrackedLink
                                analyticsId="dashboard-recent-session-open"
                                href={`/workouts/${session.id}`}
                                className="flex items-center justify-between gap-3 rounded-xl bg-bg/40 px-3.5 py-2.5 ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04]"
                            >
                                <span className="flex items-center gap-2.5">
                                    <span className="text-sm text-text">{formatDate(session.performedAt)}</span>
                                    <StatusBadge status={session.status} />
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                    {formatWeight(session.totalVolumeKg, units)}
                                </span>
                            </TrackedLink>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}

// ── Start from a template ────────────────────────────────────

function TemplatesCard() {
    const router = useRouter()
    const { data: templates, isLoading } = useWorkoutTemplates()
    const start = useCreateSessionFromTemplate()
    const [error, setError] = useState<string | null>(null)
    const top = (templates ?? []).slice(0, 4)

    function onStart(template: WorkoutTemplateSummary) {
        setError(null)
        start.mutate(
            { templateId: template.id },
            {
                onSuccess: (r) => {
                    track('session_created_from_template', {})
                    router.push(`/workouts/${r.createSessionFromTemplate.id}`)
                },
                onError: (err) => setError(gqlErrorMessage(err)),
            },
        )
    }

    return (
        <Panel>
            <PanelHeader
                title="Start from a template"
                action={
                    <TrackedLink
                        analyticsId="dashboard-templates-manage"
                        href="/workouts/templates"
                        className="rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        Manage
                    </TrackedLink>
                }
            />

            {isLoading ? (
                <div className="mt-5 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl" />
                    ))}
                </div>
            ) : top.length === 0 ? (
                <p className="mt-5 flex-1 text-sm text-text-dim">
                    No templates yet.{' '}
                    <TrackedLink
                        analyticsId="dashboard-templates-create"
                        href="/workouts/templates"
                        className="text-text underline-offset-4 hover:underline"
                    >
                        Create one
                    </TrackedLink>{' '}
                    to start sessions in a tap.
                </p>
            ) : (
                <ul className="mt-5 space-y-2">
                    {top.map((template) => (
                        <li
                            key={template.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-bg/40 px-3.5 py-2.5 ring-1 ring-hairline"
                        >
                            <span className="flex min-w-0 items-center gap-2.5">
                                <Dumbbell className="size-4 shrink-0 text-text-faint" />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm text-text">{template.name}</span>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                        {template.exerciseCount} ex · {template.setCount} sets
                                    </span>
                                </span>
                            </span>
                            <TrackedButton
                                analyticsId="dashboard-template-start"
                                type="button"
                                onClick={() => onStart(template)}
                                disabled={start.isPending}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                            >
                                <Plus className="size-3.5" /> Start
                            </TrackedButton>
                        </li>
                    ))}
                </ul>
            )}

            <FormError error={error} className="mt-3" />
        </Panel>
    )
}

// ── Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
    const { data: me, isLoading } = useMe()
    const units = unitsOf(me?.units)

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">Dashboard</p>
                <h1 className="mt-3 font-display text-display">
                    <TextSwap text={isLoading ? 'Welcome back' : `Welcome, ${me?.username ?? 'lifter'}`} />
                </h1>
            </TextsReveal>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {me ? (
                    <>
                        <span className="rounded-full bg-white/[0.05] px-3 py-1 font-mono text-eyebrow uppercase text-text-dim ring-1 ring-hairline">
                            {me.role}
                        </span>
                        <span
                            className={
                                me.emailVerified
                                    ? 'inline-flex items-center gap-1.5 rounded-full bg-pr/10 px-3 py-1 font-mono text-eyebrow uppercase text-pr'
                                    : 'rounded-full bg-ember/10 px-3 py-1 font-mono text-eyebrow uppercase text-ember'
                            }
                        >
                            {me.emailVerified ? (
                                <>
                                    <Check className="size-3.5" /> Email verified
                                </>
                            ) : (
                                'Verify your email'
                            )}
                        </span>
                    </>
                ) : null}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                <WeekCard units={units} />
                <StrengthCard units={units} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:grid-cols-2 md:gap-6">
                <RecentCard units={units} />
                <TemplatesCard />
            </div>

            <PlusMenuMorph
                analyticsId="dashboard-quick-actions"
                className="fixed bottom-6 right-6 z-40"
                items={[
                    {
                        label: 'Log a workout',
                        href: '/workouts',
                        icon: <Calendar className="size-4" />,
                        analyticsId: 'quick-log-workout',
                    },
                    {
                        label: 'Analytics',
                        href: '/workouts/stats',
                        icon: <ChartLine className="size-4" />,
                        analyticsId: 'quick-analytics',
                    },
                    {
                        label: 'Your profile',
                        href: '/profile',
                        icon: <Target className="size-4" />,
                        analyticsId: 'quick-profile',
                    },
                ]}
            />
        </div>
    )
}
