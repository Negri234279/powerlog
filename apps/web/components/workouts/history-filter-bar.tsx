'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { cn } from '@/lib/cn'
import type { ExerciseData } from '@/lib/graphql/hooks/use-workouts'
import { type StatusFilter, STATUS_FILTERS } from '@/lib/workouts/use-history-filters'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { Select } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'

/**
 * Status / exercise / free-text filters for a session history. The time window
 * is not here — `PeriodNavigator` owns it (see `useHistoryFilters`).
 *
 * `analyticsPrefix` keeps the `ui_click` ids distinct per surface, so the
 * athlete's own history and a coach filtering an athlete don't land in the same
 * bucket.
 */
export function HistoryFilterBar({
    exercises,
    status,
    onStatus,
    exerciseId,
    onExercise,
    queryInput,
    onQuery,
    hasActiveFilters,
    onClear,
    analyticsPrefix,
    className,
}: {
    exercises: ExerciseData[]
    status: StatusFilter
    onStatus: (status: StatusFilter) => void
    exerciseId: string
    onExercise: (id: string) => void
    queryInput: string
    onQuery: (value: string) => void
    hasActiveFilters: boolean
    onClear: () => void
    /** Stable id prefix, e.g. `workouts` → `workouts-filter-planned`. */
    analyticsPrefix: string
    className?: string
}) {
    const t = useTranslations('workouts')
    const tt = useTranslations('taxonomy')

    // Catalog already arrives ordered by category then name — keep that order.
    const groups = useMemo(() => {
        const byCategory = new Map<string, ExerciseData[]>()

        for (const exercise of exercises) {
            const list = byCategory.get(exercise.category) ?? []
            list.push(exercise)
            byCategory.set(exercise.category, list)
        }

        return [...byCategory.entries()]
    }, [exercises])

    return (
        <div className={cn('rounded-2xl bg-shell p-1.5 ring-1 ring-hairline', className)}>
            <div className="inset-hi flex flex-col gap-3 rounded-[calc(1rem-0.25rem)] bg-surface p-4">
                <ClearableSearch
                    analyticsId={`${analyticsPrefix}-search`}
                    value={queryInput}
                    onChange={onQuery}
                    placeholder={t('searchNotes')}
                    className="w-full"
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-full bg-bg/60 p-1 ring-1 ring-hairline">
                        {STATUS_FILTERS.map((key) => (
                            <TrackedButton
                                analyticsId={`${analyticsPrefix}-filter-${key}`}
                                key={key}
                                type="button"
                                onClick={() => onStatus(key)}
                                className={cn(
                                    'rounded-full px-4 py-1.5 text-sm transition-colors duration-300',
                                    status === key ? 'bg-white/[0.08] text-text' : 'text-text-dim hover:text-text',
                                )}
                            >
                                {t(`filter.${key}`)}
                            </TrackedButton>
                        ))}
                    </div>

                    <div className="min-w-[12rem] flex-1">
                        <Select
                            value={exerciseId}
                            onChange={(e) => onExercise(e.target.value)}
                            aria-label={t('filterByExercise')}
                        >
                            <option value="">{t('allExercises')}</option>
                            {groups.map(([category, items]) => (
                                <optgroup key={category} label={tt(`category.${category}`)}>
                                    {items.map((exercise) => (
                                        <option key={exercise.id} value={exercise.id}>
                                            {exercise.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </Select>
                    </div>

                    {hasActiveFilters ? (
                        <TrackedButton
                            analyticsId={`${analyticsPrefix}-filter-clear`}
                            type="button"
                            onClick={onClear}
                            className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                        >
                            {t('clear')}
                        </TrackedButton>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
