'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { type AthleteHistoryItem, useAthleteHistory, useAthleteSession } from '@/lib/graphql/hooks/use-athlete'
import { useExercises } from '@/lib/graphql/hooks/use-workouts'
import { formatSessionDate } from '@/lib/format-date'
import { formatRange as formatTargetRange, formatWeightRange } from '@/lib/range'
import { formatWeight, type Units } from '@/lib/units'
import { backParam } from '@/lib/workouts/back-param'
import { formatRange, groupByWeek } from '@/lib/workouts/period'
import { useHistoryFilters } from '@/lib/workouts/use-history-filters'
import { HistoryFilterBar } from '@/components/workouts/history-filter-bar'
import { PeriodNavigator } from '@/components/workouts/period-navigator'
import { WeekHeading } from '@/components/workouts/week-heading'
import { ChevronDown, Pencil } from '@/components/ui/icons'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

const ANALYTICS_PREFIX = 'athlete-history'

function StatusBadge({ status }: { status: string }) {
    const t = useTranslations('common.status')
    const completed = status === 'completed'

    return (
        <span
            className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest',
                completed ? 'bg-pr/10 text-pr' : 'bg-ember/10 text-ember',
            )}
        >
            {completed ? t('completed') : t('planned')}
        </span>
    )
}

/** Read-only view of one of the athlete's sessions (loaded on first expand). */
function SessionPanel({
    athleteId,
    sessionId,
    units,
    nameById,
}: {
    athleteId: string
    sessionId: string
    units: Units
    nameById: Map<string, string>
}) {
    const t = useTranslations('workouts')
    const { data, isLoading, isError } = useAthleteSession(athleteId, sessionId)

    if (isLoading) {
        return <p className="border-t border-hairline px-5 py-4 text-sm text-text-dim">{t('loadingExercises')}</p>
    }

    if (isError || !data) {
        return <p className="border-t border-hairline px-5 py-4 text-sm text-ember">{t('loadError')}</p>
    }

    if (data.entries.length === 0) {
        return <p className="border-t border-hairline px-5 py-4 text-sm text-text-dim">{t('noExercises')}</p>
    }

    return (
        <div className="space-y-4 border-t border-hairline px-5 py-4">
            {data.entries.map((entry) => (
                <div key={entry.id}>
                    <h4 className="text-sm font-medium text-text">{nameById.get(entry.exerciseId) ?? t('exercise')}</h4>
                    <div className="mt-2 space-y-1">
                        {entry.sets.length === 0 ? (
                            <p className="text-xs text-text-faint">{t('noSets')}</p>
                        ) : (
                            entry.sets.map((set) => {
                                const logged = set.weightKg !== null && set.reps !== null
                                // Done: the single numbers lifted. Planned: the ranges
                                // programmed (`50-55 × 5-8`), shown until the set is done.
                                const main = logged
                                    ? `${formatWeight(set.weightKg, units)} × ${set.reps}`
                                    : set.plannedWeightKg && set.plannedReps
                                      ? `${formatWeightRange(set.plannedWeightKg, units)} ${units} × ${formatTargetRange(set.plannedReps)}`
                                      : null
                                const intensity = logged
                                    ? set.rpe !== null
                                        ? `RPE ${set.rpe}`
                                        : set.rir !== null
                                          ? `RIR ${set.rir}`
                                          : null
                                    : set.plannedRpe
                                      ? `RPE ${formatTargetRange(set.plannedRpe)}`
                                      : set.plannedRir
                                        ? `RIR ${formatTargetRange(set.plannedRir)}`
                                        : null

                                return (
                                    <div key={set.id} className="flex items-center gap-3 text-sm tabular-nums">
                                        <span className="w-4 shrink-0 text-right font-mono text-xs text-text-faint">
                                            {set.order}
                                        </span>
                                        <span className="text-text">
                                            {main ?? '—'}
                                            {!logged && main !== null ? (
                                                <span className="text-text-faint"> · {t('plannedSuffix')}</span>
                                            ) : null}
                                        </span>
                                        {intensity ? <span className="text-text-dim">{intensity}</span> : null}
                                        {set.e1rmKg !== null ? (
                                            <span className="ml-auto font-mono text-xs text-text-faint">
                                                e1RM {formatWeight(set.e1rmKg, units)}
                                            </span>
                                        ) : null}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function SessionRow({
    athleteId,
    session,
    units,
    nameById,
    canEdit,
    backQuery,
}: {
    athleteId: string
    session: AthleteHistoryItem
    units: Units
    nameById: Map<string, string>
    canEdit: boolean
    backQuery: string
}) {
    const t = useTranslations('coaching')
    const tw = useTranslations('workouts')
    const locale = useLocale()
    const [open, setOpen] = useState(false)
    const [hasOpened, setHasOpened] = useState(false)

    function toggle() {
        setOpen((o) => {
            if (!o) setHasOpened(true)
            return !o
        })
    }

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="t-acc inset-hi rounded-[calc(1rem-0.25rem)] bg-surface" data-open={open}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <TrackedButton
                        analyticsId="athlete-session-expand"
                        type="button"
                        onClick={toggle}
                        aria-expanded={open}
                        className="flex min-w-0 items-center gap-3 text-left"
                    >
                        <span className="t-acc-chevron text-text-faint">
                            <ChevronDown className="size-4" />
                        </span>
                        <span className="font-display text-lg tracking-tight">
                            {formatSessionDate(session.performedAt, locale)}
                        </span>
                        <StatusBadge status={session.status} />
                    </TrackedButton>

                    <div className="flex shrink-0 items-center gap-5 pl-7 font-mono text-sm tabular-nums sm:pl-0">
                        <span className="text-text-dim">
                            {session.setCount} {tw('statSets').toLowerCase()}
                        </span>
                        <span className="text-text">{formatWeight(session.totalVolumeKg, units)}</span>
                        {canEdit ? (
                            <TrackedLink
                                analyticsId="athlete-session-edit-plan"
                                href={`/coaching/athletes/${athleteId}/workouts/${session.id}${backParam(backQuery)}`}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                            >
                                <Pencil className="size-3" /> {t('editPlan')}
                            </TrackedLink>
                        ) : null}
                    </div>
                </div>

                <div className="t-acc-panel">
                    <div className="t-acc-panel-inner">
                        {hasOpened ? (
                            <SessionPanel
                                athleteId={athleteId}
                                sessionId={session.id}
                                units={units}
                                nameById={nameById}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

/** The athlete's session history, read-only — plus a shortcut to edit what the coach planned. */
export function AthleteTraining({ athleteId, coachId, units }: { athleteId: string; coachId: string; units: Units }) {
    const t = useTranslations('coaching')
    const tw = useTranslations('workouts')
    const locale = useLocale()

    // Opens on the current month: enough context to judge adherence and volume,
    // where a week can read as empty for an athlete who trains sparsely.
    const history = useHistoryFilters('month')
    const query = useAthleteHistory(athleteId, history.filters)
    const { data: exercises } = useExercises()

    const nameById = useMemo(
        () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name])),
        [exercises],
    )

    const sessions = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
    const weeks = useMemo(() => groupByWeek(sessions, (session) => session.performedAt), [sessions])
    // A single week needs no dividers, and neither does the week view itself.
    const showWeeks = history.periodMode !== 'week' && weeks.length > 1

    function renderRow(session: AthleteHistoryItem) {
        return (
            <SessionRow
                key={session.id}
                athleteId={athleteId}
                session={session}
                units={units}
                nameById={nameById}
                canEdit={session.plannedByUserId === coachId}
                backQuery={history.queryString}
            />
        )
    }

    return (
        <div className="space-y-4">
            <PeriodNavigator
                analyticsPrefix={ANALYTICS_PREFIX}
                mode={history.periodMode}
                onMode={history.setPeriod}
                onPrev={history.prevPeriod}
                onNext={history.nextPeriod}
                onCurrent={history.currentPeriod}
                label={history.windowLabel()}
                isCurrent={history.periodOffset === 0}
                from={history.from}
                to={history.to}
                onFrom={history.setFrom}
                onTo={history.setTo}
            />

            <HistoryFilterBar
                analyticsPrefix={ANALYTICS_PREFIX}
                exercises={exercises ?? []}
                status={history.status}
                onStatus={history.setStatus}
                exerciseId={history.exerciseId}
                onExercise={history.setExerciseId}
                queryInput={history.queryInput}
                onQuery={history.setQueryInput}
                hasActiveFilters={history.hasActiveFilters}
                onClear={history.clear}
            />

            <div
                className={cn(
                    'transition-opacity duration-200',
                    query.isPlaceholderData && 'pointer-events-none opacity-50',
                )}
            >
                {query.isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
                        ))}
                    </div>
                ) : query.isError ? (
                    <QueryError
                        message={t('trainingLoadError')}
                        onRetry={() => void query.refetch()}
                        analyticsId="athlete-history-retry"
                    />
                ) : sessions.length === 0 ? (
                    // Three different kinds of "nothing here", three different next steps.
                    <div className="rounded-2xl bg-bg/40 p-6 ring-1 ring-hairline">
                        {history.hasActiveFilters ? (
                            <>
                                <p className="text-sm text-text">{tw('noMatching')}</p>
                                <TrackedButton
                                    analyticsId="athlete-history-clear-filters"
                                    type="button"
                                    onClick={history.clear}
                                    className="mt-3 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                                >
                                    {tw('clearFilters')}
                                </TrackedButton>
                            </>
                        ) : history.hasDateWindow ? (
                            <>
                                <p className="text-sm text-text">{tw('noSessionsInRange')}</p>
                                <TrackedButton
                                    analyticsId="athlete-history-view-all"
                                    type="button"
                                    onClick={() => history.setPeriod('all')}
                                    className="mt-3 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                                >
                                    {tw('viewAll')}
                                </TrackedButton>
                            </>
                        ) : (
                            <p className="text-sm text-text-faint">{t('noSessions')}</p>
                        )}
                    </div>
                ) : showWeeks ? (
                    <div className="space-y-6">
                        {weeks.map((week) => (
                            <div key={week.key} className="space-y-3">
                                <WeekHeading
                                    label={formatRange('week', week.range, locale)}
                                    sessions={week.items.length}
                                    volumeKg={week.items.reduce((total, item) => total + item.totalVolumeKg, 0)}
                                    units={units}
                                />
                                {week.items.map(renderRow)}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">{sessions.map(renderRow)}</div>
                )}
            </div>

            {query.hasNextPage ? (
                <TrackedButton
                    analyticsId="athlete-history-more"
                    type="button"
                    onClick={() => void query.fetchNextPage()}
                    disabled={query.isFetchingNextPage}
                    className="w-full rounded-full px-4 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                >
                    {query.isFetchingNextPage ? t('loading') : t('loadMore')}
                </TrackedButton>
            ) : null}
        </div>
    )
}
