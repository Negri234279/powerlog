'use client'

import { useTranslations } from 'next-intl'

import type { AiDraftKindFilter } from '@/lib/graphql/hooks/use-ai-history'
import { FilterChip } from '@/components/ui/filter-chip'

const KINDS: AiDraftKindFilter[] = ['all', 'session', 'mesocycle']

/**
 * Kind filter. Three bounded options, so chips rather than a select: one tap,
 * thumb-reachable, no popover to open on a phone.
 *
 * The value lives in the URL (`?kind=`), not in component state — that is what
 * makes the panels' "previous plans" link able to deep-link into a scoped view,
 * and what makes the back button behave.
 */
export function AiHistoryFilters({
    value,
    onChange,
}: {
    value: AiDraftKindFilter
    onChange: (kind: AiDraftKindFilter) => void
}) {
    const t = useTranslations('aiHistory.filters')

    return (
        <div role="group" aria-label={t('label')} className="flex flex-wrap items-center gap-2">
            {KINDS.map((kind) => (
                <FilterChip
                    key={kind}
                    analyticsId={`ai-history-filter-${kind}`}
                    label={t(kind)}
                    active={value === kind}
                    aria-pressed={value === kind}
                    onClick={() => onChange(kind)}
                />
            ))}
        </div>
    )
}
