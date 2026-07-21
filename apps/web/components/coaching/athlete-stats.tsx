'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { useAthleteExecution, useAthleteExerciseStats, useAthleteSummary } from '@/lib/graphql/hooks/use-athlete'
import type { Units } from '@/lib/units'
import { ExecutionPanel } from '@/components/coaching/stats/execution-panel'
import { ExerciseTable } from '@/components/coaching/stats/exercise-table'
import { LastSessionHeader } from '@/components/coaching/stats/last-session-header'
import { ProgramAdherencePanel } from '@/components/coaching/stats/program-adherence-panel'
import { ExecutionSkeleton, WorkloadSkeleton } from '@/components/coaching/stats/stats-skeletons'
import { useAthleteStatsView } from '@/components/coaching/stats/use-athlete-stats-view'
import { WorkloadStrip } from '@/components/coaching/stats/workload-strip'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'

type RangeKey = 'all' | '30d' | '90d' | '1y'

const RANGES: ReadonlyArray<{ key: RangeKey; labelKey: string; days: number | null }> = [
    { key: 'all', labelKey: 'rangeAll', days: null },
    { key: '30d', labelKey: 'range30', days: 30 },
    { key: '90d', labelKey: 'range90', days: 90 },
    { key: '1y', labelKey: 'range1y', days: 365 },
]

function isoDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
}

/**
 * What a coach reads about one athlete's training.
 *
 * The layout encodes a rule the numbers can't state themselves: everything below
 * the range tabs is filtered by them, and the one figure that isn't — when the
 * athlete last trained — sits above. Below that, two panels rather than a grid
 * of cards, because there are two questions here and they run over different
 * populations: adherence covers only what *this* coach programmed, while
 * execution quality covers everything the athlete lifts. Two percentages side by
 * side with no such boundary would invite exactly the comparison that isn't
 * valid.
 */
export function AthleteStats({ athleteId, units }: { athleteId: string; units: Units }) {
    const t = useTranslations('coaching')
    const ts = useTranslations('stats')
    const [range, setRange] = useState<RangeKey>('90d')

    const days = RANGES.find((r) => r.key === range)?.days ?? null
    // Anchor `from` to the selected range, not to render time: isoDaysAgo() reads
    // `new Date()` at ms precision, so recomputing it every render would hand the
    // query a fresh key each time → refetch → re-render → refetch (an infinite loop).
    const from = useMemo(() => (days === null ? undefined : isoDaysAgo(days)), [days])

    const summary = useAthleteSummary(athleteId, from)
    const execution = useAthleteExecution(athleteId, from)
    const stats = useAthleteExerciseStats(athleteId, from)

    const view = useAthleteStatsView(execution.data ?? undefined)
    const rows = [...(stats.data ?? [])].sort((a, b) => b.totalVolumeKg - a.totalVolumeKg)

    // The panels and the strip come from the same pair of queries, so they share
    // one loading branch and one error box — three separate retry buttons for a
    // single failure is noise, not information.
    const loading = summary.isLoading || execution.isLoading
    const failed = summary.isError || execution.isError
    // A range switch refetches; dimming what's on screen beats flashing skeletons.
    const refetching = (summary.isFetching || execution.isFetching) && !loading

    return (
        <div className="space-y-6">
            <LastSessionHeader
                lastSessionAt={execution.data?.lastSessionAt}
                days={execution.data?.daysSinceLastSession}
                staleness={view?.staleness ?? 'never'}
            />

            <div className="border-t border-hairline pt-6">
                <SlidingTabs
                    analyticsId="athlete-stats-range"
                    value={range}
                    onChange={(value) => setRange(value as RangeKey)}
                    items={RANGES.map((r) => ({ value: r.key, label: ts(r.labelKey) }))}
                />
            </div>

            <div
                role="tabpanel"
                aria-live="polite"
                aria-busy={refetching}
                className={cn('space-y-4 transition-opacity duration-300', refetching && 'opacity-60')}
            >
                {loading ? (
                    <>
                        <ExecutionSkeleton />
                        <WorkloadSkeleton />
                    </>
                ) : failed ? (
                    <QueryError
                        message={t('statsLoadError')}
                        onRetry={() => {
                            void summary.refetch()
                            void execution.refetch()
                        }}
                        analyticsId="athlete-summary-retry"
                    />
                ) : view ? (
                    <>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <ProgramAdherencePanel view={view} athleteId={athleteId} />
                            <ExecutionPanel view={view} avgRpe={summary.data?.avgRpe} />
                        </div>

                        <WorkloadStrip summary={summary.data ?? undefined} execution={execution.data} units={units} />
                    </>
                ) : null}

                {stats.isLoading ? (
                    <Skeleton className="h-48 rounded-2xl" />
                ) : stats.isError ? (
                    <QueryError
                        message={t('statsLoadError')}
                        onRetry={() => void stats.refetch()}
                        analyticsId="athlete-stats-retry"
                    />
                ) : rows.length === 0 ? (
                    <p className="text-sm text-text-faint">{t('noStats')}</p>
                ) : (
                    <ExerciseTable rows={rows} units={units} />
                )}
            </div>
        </div>
    )
}
