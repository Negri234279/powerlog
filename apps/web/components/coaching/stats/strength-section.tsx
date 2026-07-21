'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import type { AthleteStatsRow } from '@/lib/graphql/hooks/use-athlete'
import { useAthleteStrengthProgression } from '@/lib/graphql/hooks/use-athlete'
import { formatWeight, type Units } from '@/lib/units'
import { StrengthTrendChart } from '@/components/charts'

import { ChartSection } from './chart-section'

/** Competition lifts first — what a coach checks before writing the next block. */
const PREFERRED = ['squat', 'bench', 'deadlift']

/**
 * e1RM progression for one lift, with its linear trend and projections.
 *
 * The picker only offers lifts the athlete actually trained in the selected
 * range, so it can never present an exercise whose chart would be empty. When
 * the range changes and drops the current pick, it re-picks rather than showing
 * a blank chart for a lift that is no longer in scope.
 */
export function StrengthSection({
    athleteId,
    rows,
    from,
    units,
}: {
    athleteId: string
    rows: readonly AthleteStatsRow[]
    from?: string
    units: Units
}) {
    const t = useTranslations('coaching.athleteStats')
    const ts = useTranslations('stats')
    const tt = useTranslations('taxonomy')
    const [liftId, setLiftId] = useState('')

    const groups = useMemo(() => {
        const byCategory = new Map<string, { exerciseId: string; name: string }[]>()

        for (const row of rows) {
            const list = byCategory.get(row.category) ?? []
            list.push({ exerciseId: row.exerciseId, name: row.name })
            byCategory.set(row.category, list)
        }

        return [...byCategory.entries()]
    }, [rows])

    useEffect(() => {
        if (rows.length === 0) return
        if (liftId && rows.some((row) => row.exerciseId === liftId)) return

        const competition = PREFERRED.map((category) => rows.find((row) => row.category === category)).find(Boolean)
        setLiftId((competition ?? rows[0])?.exerciseId ?? '')
    }, [rows, liftId])

    const progression = useAthleteStrengthProgression(athleteId, liftId || undefined, from)
    const formatValue = useMemo(() => (value: number) => formatWeight(value, units), [units])
    const points = progression.data?.points ?? []
    const trend = progression.data?.trend ?? null

    return (
        <ChartSection
            title={ts('progressionTitle')}
            scope={t('strengthScope')}
            loading={progression.isLoading}
            empty={rows.length === 0 ? t('noStrengthData') : points.length === 0 ? ts('noE1rm') : null}
            action={
                groups.length > 0 ? (
                    <select
                        value={liftId}
                        onChange={(event) => setLiftId(event.target.value)}
                        aria-label={ts('exerciseAria')}
                        className="appearance-none rounded-full bg-bg/60 px-4 py-2 text-sm text-text ring-1 ring-hairline outline-none focus:ring-ember/50"
                    >
                        {groups.map(([category, items]) => (
                            <optgroup key={category} label={tt(`category.${category}`)}>
                                {items.map((exercise) => (
                                    <option key={exercise.exerciseId} value={exercise.exerciseId}>
                                        {exercise.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                ) : null
            }
        >
            <StrengthTrendChart
                points={points}
                trend={trend}
                formatValue={formatValue}
                projectedLabel={ts('seriesProjected')}
            />

            {trend ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="text-text-dim">
                        {ts('trend')}{' '}
                        <span
                            className={cn(
                                'font-mono tabular-nums',
                                trend.slopePerWeekKg >= 0 ? 'text-pr' : 'text-ember',
                            )}
                        >
                            {trend.slopePerWeekKg >= 0 ? '+' : ''}
                            {ts('perWeek', { value: formatValue(trend.slopePerWeekKg) })}
                        </span>
                    </span>
                    <span className="text-text-dim">
                        {ts('fit')} <span className="font-mono text-text">R² {trend.r2.toFixed(2)}</span>
                    </span>
                    {trend.projections.map((projection) => (
                        <span key={projection.weeks} className="text-text-dim">
                            {ts('projWeeks', { weeks: projection.weeks })}{' '}
                            <span className="font-mono tabular-nums text-amber">{formatValue(projection.e1rmKg)}</span>
                        </span>
                    ))}
                </div>
            ) : points.length > 0 ? (
                <p className="mt-4 text-sm text-text-faint">{ts('needTwo')}</p>
            ) : null}
        </ChartSection>
    )
}
