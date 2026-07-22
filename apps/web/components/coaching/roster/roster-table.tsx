'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import { TrackedButton } from '@/components/ui/tracked'

import { AdherenceCell, LastSessionCell, NextSessionCell } from './roster-cells'
import { RosterIdentity } from './roster-identity'
import { useAttentionReason } from './use-attention-reason'
import type { RosterRow, RosterSort, SortDirection } from './use-roster'

/** Metrics sort worst-first on the first click; names sort A→Z. */
const FIRST_DIRECTION: Record<RosterSort, SortDirection> = {
    attention: 'desc',
    name: 'asc',
    last: 'desc',
    adherence: 'asc',
    next: 'asc',
}

const EDGE: Record<string, string> = {
    urgent: 'bg-ember',
    warning: 'bg-amber',
    none: '',
}

/** One clickable sort control. Carries the arrow when it's the active order. */
function SortControl({
    column,
    label,
    sort,
    direction,
    onSort,
    disabled,
}: {
    column: RosterSort
    label: string
    sort: RosterSort
    direction: SortDirection
    onSort: (column: RosterSort) => void
    disabled: boolean
}) {
    const t = useTranslations('coaching.roster')
    const active = sort === column

    return (
        <TrackedButton
            analyticsId={`roster-sort-${column}`}
            type="button"
            disabled={disabled}
            onClick={() => onSort(column)}
            aria-label={t('sortBy', { column: label })}
            className={cn(
                'group inline-flex items-center gap-1 transition-colors duration-300 disabled:cursor-default disabled:opacity-50',
                active ? 'text-text' : 'hover:text-text-dim',
            )}
        >
            {label}
            {/* The glyph's space is reserved whether or not it shows, so revealing
                it on hover can't nudge the label sideways. */}
            <span aria-hidden className={cn(!active && 'opacity-0 transition-opacity group-hover:opacity-50')}>
                {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
            </span>
        </TrackedButton>
    )
}

/**
 * A column header, plus — on the first one — the attention sort.
 *
 * Attention is the default order and the only one with no column of its own, so
 * without a control here the table loads sorted with nothing to say so, and the
 * only route back to it is a filter click. It rides in the identity header
 * because it orders the whole row rather than any single value.
 */
function SortableHeader({
    column,
    label,
    sort,
    direction,
    onSort,
    disabled,
    attentionDisabled = false,
    withAttention = false,
}: {
    column: RosterSort
    label: string
    sort: RosterSort
    direction: SortDirection
    onSort: (column: RosterSort) => void
    disabled: boolean
    /** Attention needs metrics, so it disables independently of the name column. */
    attentionDisabled?: boolean
    withAttention?: boolean
}) {
    const t = useTranslations('coaching.roster')
    // The cell announces whichever of its controls is active.
    const active = sort === column || (withAttention && sort === 'attention')

    return (
        <th
            scope="col"
            aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            className="px-4 py-3 text-right align-bottom font-normal first:pl-5 first:text-left last:pr-5"
        >
            <span className="inline-flex items-center gap-2">
                <SortControl
                    column={column}
                    label={label}
                    sort={sort}
                    direction={direction}
                    onSort={onSort}
                    disabled={disabled}
                />
                {withAttention ? (
                    <>
                        <span aria-hidden className="text-hairline">
                            ·
                        </span>
                        <SortControl
                            column="attention"
                            label={t('sort.attention')}
                            sort={sort}
                            direction={direction}
                            onSort={onSort}
                            disabled={attentionDisabled}
                        />
                    </>
                ) : null}
            </span>
        </th>
    )
}

/**
 * The roster from `md` up. Below that the cards take over — a table at 360px
 * either scrolls sideways or truncates, and a roster you have to drag is not a
 * scan surface.
 */
export function RosterTable({
    rows,
    sort,
    direction,
    onSort,
    sortDisabled,
}: {
    rows: readonly RosterRow[]
    sort: RosterSort
    direction: SortDirection
    onSort: (column: RosterSort, firstDirection: SortDirection) => void
    /** True while metrics are still loading — sorting data you don't have is a lie. */
    sortDisabled: boolean
}) {
    const t = useTranslations('coaching.roster')
    const attentionOf = useAttentionReason()

    const handleSort = (column: RosterSort) => onSort(column, FIRST_DIRECTION[column])

    const headers: Array<{ column: RosterSort; label: string }> = [
        { column: 'name', label: t('colAthlete') },
        { column: 'last', label: t('colLast') },
        { column: 'adherence', label: t('colAdherence') },
        { column: 'next', label: t('colNext') },
    ]

    return (
        <div className="hidden overflow-hidden rounded-2xl bg-bg/40 ring-1 ring-hairline md:block">
            <table className="w-full text-sm">
                <caption className="sr-only">{t('tableCaption')}</caption>
                <thead>
                    <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {headers.map((header) => (
                            <SortableHeader
                                key={header.column}
                                column={header.column}
                                label={header.label}
                                sort={sort}
                                direction={direction}
                                onSort={handleSort}
                                disabled={sortDisabled && header.column !== 'name'}
                                attentionDisabled={sortDisabled}
                                withAttention={header.column === 'name'}
                            />
                        ))}
                    </tr>
                </thead>
                <tbody className="transition-opacity duration-200">
                    {rows.map((row) => {
                        const { reason, tone } = attentionOf(row)

                        return (
                            <tr
                                key={row.user.userId}
                                className={cn(
                                    'relative border-b border-hairline/60 transition-colors duration-300 last:border-0 hover:bg-white/[0.02]',
                                    'has-[a:focus-visible]:ring-1 has-[a:focus-visible]:ring-ember/50',
                                )}
                            >
                                <td className="py-3 pl-5 pr-4">
                                    {/* A real element, not a `tr::before`: CSS wraps any
                                        non-cell child of a table-row in an anonymous
                                        table-cell, so a pseudo-element there silently
                                        gives the flagged row one column more than the
                                        others and shifts every value out of line.
                                        Absolute against the `relative` row, so it still
                                        spans the full row height. Decorative — the reason
                                        is sr-only in the identity cell. */}
                                    {tone !== 'none' ? (
                                        <span
                                            aria-hidden
                                            className={cn('absolute inset-y-0 left-0 w-[2px]', EDGE[tone])}
                                        />
                                    ) : null}
                                    <RosterIdentity row={row} reason={reason} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <LastSessionCell row={row} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <AdherenceCell row={row} />
                                </td>
                                <td className="py-3 pl-4 pr-5 text-right">
                                    <NextSessionCell row={row} />
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
