'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { type CoachUser, useMyAthleteRoster } from '@/lib/graphql/hooks/use-coaching'
import type { Units } from '@/lib/units'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton } from '@/components/ui/tracked'

import { RosterCards } from './roster-cards'
import { RosterTable } from './roster-table'
import { type RangeKey, ROSTER_RANGES, RosterToolbar } from './roster-toolbar'
import { type RosterFilter, type RosterSort, type SortDirection, useRoster } from './use-roster'

/** Below this many athletes the toolbar is more chrome than the list is content. */
const TOOLBAR_THRESHOLD = 6

function isoDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
}

/**
 * The coach's roster: who needs attention today, and a way into their detail.
 *
 * Identity and training rollups come from two queries and merge by `athleteId`.
 * Identity alone is enough to render the right rows at the right height, so it
 * does — the metrics fill in per cell rather than the whole table waiting behind
 * a skeleton, which would flash and then shift.
 *
 * The default order is attention, not alphabetical: alphabetical serves lookup,
 * and lookup is what the search box is for.
 */
export function AthleteRoster({ athletes, units }: { athletes: readonly CoachUser[]; units: Units }) {
    const t = useTranslations('coaching.roster')

    // 30 days, deliberately unlike the athlete detail's 90: this screen asks
    // "what's happening now", and a 90-day adherence smooths over exactly the
    // athlete who fell off a fortnight ago.
    const [range, setRange] = useState<RangeKey>('30d')
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<RosterFilter>('all')
    const [sort, setSort] = useState<RosterSort>('attention')
    const [direction, setDirection] = useState<SortDirection>('desc')

    const days = ROSTER_RANGES.find((r) => r.key === range)?.days ?? null
    const from = useMemo(() => (days === null ? undefined : isoDaysAgo(days)), [days])

    const metrics = useMyAthleteRoster(from, athletes.length > 0)
    const metricsReady = metrics.data !== undefined

    const { rows, counts } = useRoster(athletes, metrics.data, { query, filter, sort, direction })

    // No "don't resort under the user" guard is needed: sort is explicit state,
    // so when metrics land the list re-sorts by whatever column they chose. The
    // only automatic move is the first one, from alphabetical (all rows rank
    // equal without metrics) to attention — which is the point.
    function onSort(column: RosterSort, firstDirection: SortDirection) {
        if (column === sort) {
            setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
            return
        }

        setSort(column)
        setDirection(firstDirection)
    }

    function onFilter(next: RosterFilter) {
        setFilter(next)
        // "Todos" is also the way back to the default ordering.
        if (next === 'all' && sort !== 'attention') {
            setSort('attention')
            setDirection('desc')
        }
    }

    const refetching = metrics.isFetching && metricsReady

    return (
        <div className="space-y-4">
            {athletes.length >= TOOLBAR_THRESHOLD ? (
                <RosterToolbar
                    query={query}
                    onQuery={setQuery}
                    filter={filter}
                    onFilter={onFilter}
                    counts={counts}
                    range={range}
                    onRange={setRange}
                    sort={sort}
                    onSort={setSort}
                    metricsReady={metricsReady}
                />
            ) : null}

            {/* A metrics failure must not cost the coach the roster: identity still
                renders and every athlete stays reachable. One retry, not one per row. */}
            {metrics.isError ? (
                <QueryError
                    message={t('metricsError')}
                    onRetry={() => void metrics.refetch()}
                    analyticsId="roster-metrics-retry"
                />
            ) : null}

            <p className="text-xs text-text-faint">{t('scopeNote')}</p>

            {rows.length === 0 ? (
                <div className="rounded-2xl bg-bg/40 p-6 text-center ring-1 ring-hairline">
                    <p className="text-sm text-text-dim">
                        {filter === 'attention' ? t('noAttention') : t('noMatches', { query })}
                    </p>
                    {filter !== 'attention' ? (
                        <TrackedButton
                            analyticsId="roster-search-clear-empty"
                            type="button"
                            onClick={() => {
                                setQuery('')
                                setFilter('all')
                            }}
                            className="mt-3 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                        >
                            {t('clearSearch')}
                        </TrackedButton>
                    ) : null}
                </div>
            ) : (
                <div
                    aria-busy={refetching}
                    className={cn('transition-opacity duration-300', refetching && 'opacity-60')}
                >
                    <RosterTable
                        rows={rows}
                        units={units}
                        sort={sort}
                        direction={direction}
                        onSort={onSort}
                        sortDisabled={!metricsReady}
                    />
                    <RosterCards rows={rows} />
                </div>
            )}

            {/* One polite announcement per result change, not one per row. */}
            <p aria-live="polite" className="sr-only">
                {t('resultsAnnouncement', { total: rows.length, attention: counts.attention })}
            </p>
        </div>
    )
}

/** Identity-loading state: real row heights, so nothing shifts when they arrive. */
export function RosterSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
        </div>
    )
}
