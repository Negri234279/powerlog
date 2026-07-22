'use client'

import { useTranslations } from 'next-intl'

import { MultiSelect } from '@/components/ui/multi-select'

import { ATTENTION_REASONS, type AttentionReason, type RosterCounts } from './use-roster'

/**
 * The attention facet.
 *
 * Its badge counts **athletes**, not ticked boxes — the coach's question is "how
 * many people", never "how many checkboxes". That's honest here only because the
 * reasons partition the roster: each athlete carries exactly one, so the per-
 * reason counts are disjoint and their sum is the union with nobody double-counted.
 *
 * With one reason picked the trigger takes that reason's own short label, so the
 * pill says what it's showing without needing to be opened.
 */
export function AttentionFilter({
    selected,
    onChange,
    counts,
    ready,
    describedBy,
}: {
    selected: readonly AttentionReason[]
    onChange: (next: AttentionReason[]) => void
    counts: RosterCounts['attention']
    /** False while metrics load: counts are unknowable, so the facet is inert. */
    ready: boolean
    describedBy?: string
}) {
    const t = useTranslations('coaching.roster')

    const options = ATTENTION_REASONS.map((reason) => ({
        value: reason,
        label: t(`attentionReason.${reason}`),
        count: ready ? String(counts[reason]) : '—',
        countLabel: ready ? t('athleteCount', { count: counts[reason] }) : undefined,
    }))

    // Union of what's picked, or everything flagged when nothing is.
    const matched = selected.length === 0 ? counts.any : selected.reduce((sum, reason) => sum + counts[reason], 0)
    const label = selected.length === 1 ? t(`attentionReason.${selected[0]!}`) : t('filterAttention')

    return (
        <MultiSelect
            analyticsId="roster-filter-attention"
            label={label}
            ariaLabel={t('filterAttentionAria')}
            describedBy={describedBy}
            disabled={!ready}
            options={options}
            selected={[...selected]}
            onChange={(next) => onChange(next as AttentionReason[])}
            badge={ready ? String(matched) : '—'}
        />
    )
}
