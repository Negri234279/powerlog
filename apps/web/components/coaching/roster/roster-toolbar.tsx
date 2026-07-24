'use client'

import { useTranslations } from 'next-intl'
import type { RefObject } from 'react'

import { ClearableSearch } from '@/components/ui/clearable-search'
import { FilterChip } from '@/components/ui/filter-chip'
import { Menu } from '@/components/ui/menu'
import { SlidingTabs } from '@/components/ui/sliding-tabs'

import { AttentionFilter } from './attention-filter'
import type { AttentionReason, RosterCounts, RosterSort } from './use-roster'

export type RangeKey = 'all' | '30d' | '90d' | '1y'

export const ROSTER_RANGES: ReadonlyArray<{ key: RangeKey; labelKey: string; days: number | null }> = [
    { key: '30d', labelKey: 'range30', days: 30 },
    { key: '90d', labelKey: 'range90', days: 90 },
    { key: '1y', labelKey: 'range1y', days: 365 },
    { key: 'all', labelKey: 'rangeAll', days: null },
]

const SORTS: readonly RosterSort[] = ['attention', 'last', 'adherence', 'next', 'name']

export interface ToolbarState {
    query: string
    onQuery: (value: string) => void
    attention: readonly AttentionReason[]
    onAttention: (next: AttentionReason[]) => void
    week: boolean
    onWeek: (next: boolean) => void
    range: RangeKey
    onRange: (value: RangeKey) => void
    sort: RosterSort
    onSort: (value: RosterSort) => void
}

/**
 * Search, filters and the measurement window.
 *
 * Everything renders at every roster size. An earlier version hid search, the
 * week toggle and the mobile sort below six athletes on the grounds that a short
 * list needs no filtering — which sounds reasonable and is wrong twice over. It
 * hides the feature from exactly the coaches most likely to go looking for it,
 * and since the sortable column headers only exist from `md` up, gating the
 * mobile sort left small rosters with no way to sort on a phone at all.
 *
 * The range tabs are deliberately not shaped like the filter chips: they don't
 * remove rows, they change what the numbers mean.
 */
export function RosterToolbar({
    state,
    counts,
    metricsReady,
    searchFocusRef,
    disabledHintId,
}: {
    state: ToolbarState
    counts: RosterCounts
    metricsReady: boolean
    searchFocusRef?: RefObject<(() => void) | null>
    disabledHintId?: string
}) {
    const t = useTranslations('coaching.roster')
    const ts = useTranslations('stats')

    const rangeItems = ROSTER_RANGES.map((r) => ({ value: r.key, label: ts(r.labelKey) }))

    return (
        <div className="space-y-3">
            {/* Mobile: one scrolling rail of pills. Desktop: a single row with the
                scope pushed to the far side. */}
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
                <AttentionFilter
                    selected={state.attention}
                    onChange={state.onAttention}
                    counts={counts.attention}
                    ready={metricsReady}
                    describedBy={metricsReady ? undefined : disabledHintId}
                />

                <FilterChip
                    analyticsId="roster-filter-week"
                    label={t('filterThisWeek')}
                    count={metricsReady ? String(counts.week) : '—'}
                    active={state.week}
                    disabled={!metricsReady}
                    aria-pressed={state.week}
                    aria-describedby={metricsReady ? undefined : disabledHintId}
                    onClick={() => state.onWeek(!state.week)}
                />

                {/* Sorting has no header row to click below `md`. */}
                <span className="md:hidden">
                    <Menu
                        analyticsId="roster-sort-mobile"
                        label={t('sortLabel')}
                        trigger={t(`sort.${state.sort}`)}
                        items={SORTS.map((option) => ({
                            label: t(`sort.${option}`),
                            onSelect: () => state.onSort(option),
                            analyticsId: `roster-sort-mobile-${option}`,
                        }))}
                    />
                </span>

                {/* A SlidingTabs inside a scrolling rail is a nested scroll, so the
                    scope collapses to a menu on small screens. */}
                <span className="md:hidden">
                    <Menu
                        analyticsId="roster-range-menu"
                        label={t('rangeAria')}
                        trigger={ts(ROSTER_RANGES.find((r) => r.key === state.range)?.labelKey ?? 'range30')}
                        items={rangeItems.map((item) => ({
                            label: item.label,
                            onSelect: () => state.onRange(item.value as RangeKey),
                            analyticsId: `roster-range-menu-${item.value}`,
                        }))}
                    />
                </span>

                <span className="ml-auto hidden md:block">
                    <SlidingTabs
                        analyticsId="roster-range"
                        ariaLabel={t('rangeAria')}
                        value={state.range}
                        onChange={(value) => state.onRange(value as RangeKey)}
                        items={rangeItems}
                    />
                </span>
            </div>

            <div className="md:max-w-80">
                <ClearableSearch
                    analyticsId="roster-search"
                    value={state.query}
                    onChange={state.onQuery}
                    placeholder={t('searchPlaceholder')}
                    shortcut
                    focusRef={searchFocusRef}
                />
            </div>
        </div>
    )
}
