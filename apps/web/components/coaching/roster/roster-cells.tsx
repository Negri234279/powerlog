'use client'

import { useLocale, useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import { formatSessionDate } from '@/lib/format-date'
import { formatWeight, type Units } from '@/lib/units'
import { TrendChip } from '@/components/stats/trend-chip'
import { Skeleton } from '@/components/ui/skeleton'

import type { RosterRow } from './use-roster'

/** A metric cell that hasn't loaded yet — sized to its value so nothing shifts. */
export function CellSkeleton({ wide = false }: { wide?: boolean }) {
    return (
        <div className="flex flex-col items-end gap-1.5">
            <Skeleton className={cn('h-4', wide ? 'w-16' : 'w-12')} />
            <Skeleton className="h-3 w-20" />
        </div>
    )
}

/** An em dash plus, when there is one, the reason it's a dash. */
export function Absent({ reason }: { reason?: string }) {
    return (
        <div className="text-text-faint">
            <span className="tabular-nums">—</span>
            {reason ? <span className="mt-0.5 block text-xs">{reason}</span> : null}
        </div>
    )
}

/** Days since the last session. "Nunca" is a value here, not missing data. */
export function LastSessionCell({ row }: { row: RosterRow }) {
    const t = useTranslations('coaching.roster')
    const locale = useLocale()

    if (!row.metrics) return <CellSkeleton />

    const { daysSinceLastSession: days, lastSessionAt } = row.metrics
    const stale = days === null || days > 7

    return (
        <div>
            <span className={cn('tabular-nums', stale ? 'text-ember' : days <= 3 ? 'text-pr' : 'text-text')}>
                {days === null ? t('never') : t('daysShort', { days })}
            </span>
            {lastSessionAt ? (
                <span className="mt-0.5 block text-xs text-text-faint">{formatSessionDate(lastSessionAt, locale)}</span>
            ) : null}
        </div>
    )
}

/** Adherence to this coach's programming, never without its denominator. */
export function AdherenceCell({ row }: { row: RosterRow }) {
    const t = useTranslations('coaching.roster')

    if (!row.metrics) return <CellSkeleton />

    const { adherenceRate, plannedCompleted, plannedDue, attention } = row.metrics
    if (adherenceRate === null) return <Absent reason={t('notProgrammed')} />

    return (
        <div>
            <span className={cn('tabular-nums', attention === 'lowAdherence' ? 'text-amber' : 'text-text')}>
                {Math.round(adherenceRate * 100)}%
            </span>
            <span className="mt-0.5 block text-xs text-text-faint tabular-nums">
                {t('adherenceDetail', { done: plannedCompleted, due: plannedDue })}
            </span>
        </div>
    )
}

/** Volume in range with its trend. Null (not zero) when they didn't train. */
export function VolumeCell({ row, units }: { row: RosterRow; units: Units }) {
    if (!row.metrics) return <CellSkeleton wide />
    if (row.metrics.volumeKg === null) return <Absent />

    return (
        <div>
            <span className="tabular-nums text-text">{formatWeight(row.metrics.volumeKg, units)}</span>
            <span className="mt-0.5 block">
                <TrendChip change={row.metrics.volumeChange} />
            </span>
        </div>
    )
}

/** The next planned session, all-future. */
export function NextSessionCell({ row }: { row: RosterRow }) {
    const locale = useLocale()

    if (!row.metrics) return <CellSkeleton />
    if (!row.metrics.nextSessionAt) return <Absent />

    return <span className="text-text-dim">{formatSessionDate(row.metrics.nextSessionAt, locale)}</span>
}
