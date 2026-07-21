'use client'

import { useTranslations } from 'next-intl'

import { ClearableSearch } from '@/components/ui/clearable-search'
import { SlidingTabs } from '@/components/ui/sliding-tabs'

import type { RosterFilter, RosterSort } from './use-roster'

export type RangeKey = 'all' | '30d' | '90d' | '1y'

export const ROSTER_RANGES: ReadonlyArray<{ key: RangeKey; labelKey: string; days: number | null }> = [
    { key: '30d', labelKey: 'range30', days: 30 },
    { key: '90d', labelKey: 'range90', days: 90 },
    { key: '1y', labelKey: 'range1y', days: 365 },
    { key: 'all', labelKey: 'rangeAll', days: null },
]

const SORTS: readonly RosterSort[] = ['attention', 'last', 'adherence', 'next', 'name']

/**
 * Search, status segments and range scope.
 *
 * Not rendered at all below six athletes — you don't filter a list you can see
 * entirely, and three controls above four rows is chrome outweighing content.
 * The mobile sort `<select>` exists because the card list has no column headers
 * to click; on desktop the headers *are* the control.
 */
export function RosterToolbar({
    query,
    onQuery,
    filter,
    onFilter,
    counts,
    range,
    onRange,
    sort,
    onSort,
    metricsReady,
}: {
    query: string
    onQuery: (value: string) => void
    filter: RosterFilter
    onFilter: (value: RosterFilter) => void
    counts: { all: number; attention: number; thisWeek: number }
    range: RangeKey
    onRange: (value: RangeKey) => void
    sort: RosterSort
    onSort: (value: RosterSort) => void
    metricsReady: boolean
}) {
    const t = useTranslations('coaching.roster')
    const ts = useTranslations('stats')

    // Until metrics land the counts are unknown — "Atención 0" would be a claim,
    // "Atención —" is the truth.
    const count = (value: number) => (metricsReady ? String(value) : '—')

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <SlidingTabs
                    analyticsId="roster-filter"
                    value={filter}
                    onChange={(value) => onFilter(value as RosterFilter)}
                    items={[
                        { value: 'all', label: `${t('filterAll')} ${count(counts.all)}` },
                        { value: 'attention', label: `${t('filterAttention')} ${count(counts.attention)}` },
                        { value: 'thisWeek', label: `${t('filterThisWeek')} ${count(counts.thisWeek)}` },
                    ]}
                />

                <div className="min-w-[12rem] flex-1">
                    <ClearableSearch
                        analyticsId="roster-search"
                        value={query}
                        onChange={onQuery}
                        placeholder={t('searchPlaceholder')}
                    />
                </div>

                <SlidingTabs
                    analyticsId="roster-range"
                    value={range}
                    onChange={(value) => onRange(value as RangeKey)}
                    items={ROSTER_RANGES.map((r) => ({ value: r.key, label: ts(r.labelKey) }))}
                />
            </div>

            <div className="md:hidden">
                <label className="flex items-center gap-2 text-sm text-text-dim">
                    {t('sortLabel')}
                    <select
                        value={sort}
                        onChange={(event) => onSort(event.target.value as RosterSort)}
                        className="flex-1 appearance-none rounded-full bg-bg/60 px-4 py-2 text-sm text-text ring-1 ring-hairline outline-none focus:ring-ember/50"
                    >
                        {SORTS.map((option) => (
                            <option key={option} value={option}>
                                {t(`sort.${option}`)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    )
}
