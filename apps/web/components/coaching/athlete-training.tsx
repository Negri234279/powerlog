'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { type AthleteHistoryItem, useAthleteHistory, useAthleteSession } from '@/lib/graphql/hooks/use-athlete'
import { useExercises } from '@/lib/graphql/hooks/use-workouts'
import { formatWeight, type Units } from '@/lib/units'
import { ChevronDown, Pencil } from '@/components/ui/icons'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

type StatusFilter = 'all' | 'planned' | 'completed'

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'planned', 'completed']

function formatDate(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

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
                                const weight = logged ? set.weightKg : set.plannedWeightKg
                                const reps = logged ? set.reps : set.plannedReps
                                const intensity =
                                    set.rpe !== null ? `RPE ${set.rpe}` : set.rir !== null ? `RIR ${set.rir}` : null

                                return (
                                    <div key={set.id} className="flex items-center gap-3 text-sm tabular-nums">
                                        <span className="w-4 shrink-0 text-right font-mono text-xs text-text-faint">
                                            {set.order}
                                        </span>
                                        <span className="text-text">
                                            {weight !== null && reps !== null
                                                ? `${formatWeight(weight, units)} × ${reps}`
                                                : '—'}
                                            {!logged && weight !== null ? (
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
}: {
    athleteId: string
    session: AthleteHistoryItem
    units: Units
    nameById: Map<string, string>
    canEdit: boolean
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
                            {formatDate(session.performedAt, locale)}
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
                                href={`/coaching/athletes/${athleteId}/workouts/${session.id}`}
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
    const [status, setStatus] = useState<StatusFilter>('all')

    const history = useAthleteHistory(athleteId, status === 'all' ? undefined : status)
    const { data: exercises } = useExercises()

    const nameById = useMemo(
        () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name])),
        [exercises],
    )
    const sessions = history.data?.pages.flatMap((page) => page.items) ?? []

    return (
        <div className="space-y-4">
            <SlidingTabs
                analyticsId="athlete-history-status"
                value={status}
                onChange={(value) => setStatus(value as StatusFilter)}
                items={STATUS_FILTERS.map((value) => ({ value, label: t(`filter.${value}`) }))}
            />

            {history.isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
                    ))}
                </div>
            ) : history.isError ? (
                <QueryError
                    message={t('trainingLoadError')}
                    onRetry={() => void history.refetch()}
                    analyticsId="athlete-history-retry"
                />
            ) : sessions.length === 0 ? (
                <p className="text-sm text-text-faint">{t('noSessions')}</p>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <SessionRow
                            key={session.id}
                            athleteId={athleteId}
                            session={session}
                            units={units}
                            nameById={nameById}
                            canEdit={session.plannedByUserId === coachId}
                        />
                    ))}
                </div>
            )}

            {history.hasNextPage ? (
                <TrackedButton
                    analyticsId="athlete-history-more"
                    type="button"
                    onClick={() => void history.fetchNextPage()}
                    disabled={history.isFetchingNextPage}
                    className="w-full rounded-full px-4 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                >
                    {history.isFetchingNextPage ? t('loading') : t('loadMore')}
                </TrackedButton>
            ) : null}
        </div>
    )
}
