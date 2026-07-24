'use client'

import { useTranslations } from 'next-intl'
import { useId, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { type CoachUser, useMyAthleteRoster } from '@/lib/graphql/hooks/use-coaching'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'

import { RosterCards } from './roster-cards'
import { RosterEmpty } from './roster-empty'
import { RosterTable } from './roster-table'
import { type RangeKey, ROSTER_RANGES, RosterToolbar } from './roster-toolbar'
import { type AttentionReason, type RosterSort, type SortDirection, useRoster } from './use-roster'

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
export function AthleteRoster({ athletes }: { athletes: readonly CoachUser[] }) {
    const t = useTranslations('coaching.roster')
    const disabledHintId = useId()
    const focusSearch = useRef<(() => void) | null>(null)

    // 30 days, deliberately unlike the athlete detail's 90: this screen asks
    // "what's happening now", and a 90-day adherence smooths over exactly the
    // athlete who fell off a fortnight ago.
    const [range, setRange] = useState<RangeKey>('30d')
    const [query, setQuery] = useState('')
    const [attention, setAttention] = useState<AttentionReason[]>([])
    const [week, setWeek] = useState(false)
    const [sort, setSort] = useState<RosterSort>('attention')
    const [direction, setDirection] = useState<SortDirection>('desc')

    const days = ROSTER_RANGES.find((r) => r.key === range)?.days ?? null
    const from = useMemo(() => (days === null ? undefined : isoDaysAgo(days)), [days])

    const metrics = useMyAthleteRoster(from, athletes.length > 0)
    const metricsReady = metrics.data !== undefined

    const { rows, counts } = useRoster(athletes, metrics.data, { query, attention, week, sort, direction })

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

    function clearAll() {
        setQuery('')
        setAttention([])
        setWeek(false)
    }

    const refetching = metrics.isFetching && metricsReady
    const filtering = query.trim() !== '' || attention.length > 0 || week

    return (
        <div className="space-y-4">
            <RosterToolbar
                state={{
                    query,
                    onQuery: setQuery,
                    attention,
                    onAttention: setAttention,
                    week,
                    onWeek: setWeek,
                    range,
                    onRange: setRange,
                    sort,
                    onSort: setSort,
                }}
                counts={counts}
                metricsReady={metricsReady}
                searchFocusRef={focusSearch}
                disabledHintId={disabledHintId}
            />

            <p id={disabledHintId} className="sr-only">
                {t('needsMetrics')}
            </p>

            {/* A metrics failure must not cost the coach the roster: identity still
                renders and every athlete stays reachable. One retry, not one per row. */}
            {metrics.isError ? (
                <QueryError
                    message={t('metricsError')}
                    onRetry={() => void metrics.refetch()}
                    analyticsId="roster-metrics-retry"
                />
            ) : null}

            <p className="text-xs text-text-faint">
                {/* Only claim a subset when one is actually in force — "24 of 24" is
                    noise on an unfiltered list. */}
                {filtering ? `${t('resultCount', { visible: counts.visible, total: counts.total })} · ` : ''}
                {t('scopeNote')}
            </p>

            {rows.length === 0 ? (
                <RosterEmpty
                    query={query}
                    attention={attention}
                    week={week}
                    onClearQuery={() => {
                        setQuery('')
                        focusSearch.current?.()
                    }}
                    onClearAttention={setAttention}
                    onClearWeek={() => setWeek(false)}
                    onClearAll={clearAll}
                />
            ) : (
                <div
                    aria-busy={refetching}
                    className={cn('transition-opacity duration-300', refetching && 'opacity-60')}
                >
                    <RosterTable
                        rows={rows}
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
                {t('resultsAnnouncement', { total: counts.visible, attention: counts.attention.any })}
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
