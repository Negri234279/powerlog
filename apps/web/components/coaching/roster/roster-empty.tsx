'use client'

import { useTranslations } from 'next-intl'

import { TrackedButton } from '@/components/ui/tracked'

import type { AttentionReason } from './use-roster'

/** One active filter, with the way to drop just that one. */
function RemoveChip({ label, onRemove, analyticsId }: { label: string; onRemove: () => void; analyticsId: string }) {
    const t = useTranslations('coaching.roster')

    return (
        <TrackedButton
            analyticsId={analyticsId}
            type="button"
            onClick={onRemove}
            aria-label={t('removeFilter', { filter: label })}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
        >
            {label}
            <span aria-hidden>×</span>
        </TrackedButton>
    )
}

/**
 * What the roster says when nothing matches.
 *
 * It offers one removal per active axis rather than a single "clear everything":
 * a coach who searched a name *and* filtered to stale athletes usually wants to
 * drop one of the two, and a single nuke makes them redo the half they meant to
 * keep. Each removal hands focus back to the control it came from, so a keyboard
 * user isn't dumped at the top of the document when this block unmounts.
 *
 * The all-clear case is not a failure and doesn't get chips: "nobody needs
 * attention" is the best news this screen can deliver.
 */
export function RosterEmpty({
    query,
    attention,
    week,
    onClearQuery,
    onClearAttention,
    onClearWeek,
    onClearAll,
}: {
    query: string
    attention: readonly AttentionReason[]
    week: boolean
    onClearQuery: () => void
    onClearAttention: (next: AttentionReason[]) => void
    onClearWeek: () => void
    onClearAll: () => void
}) {
    const t = useTranslations('coaching.roster')

    const hasQuery = query.trim() !== ''
    const axes = (hasQuery ? 1 : 0) + (attention.length > 0 ? 1 : 0) + (week ? 1 : 0)

    // Nothing filtered, nothing flagged: everyone is fine.
    if (axes === 0) {
        return (
            <div className="rounded-2xl bg-bg/40 p-6 text-center ring-1 ring-hairline">
                <p className="text-sm text-text-dim">{t('noAttention')}</p>
            </div>
        )
    }

    const only = axes === 1

    return (
        <div className="rounded-2xl bg-bg/40 p-6 text-center ring-1 ring-hairline">
            <p className="text-sm text-text-dim">
                {only && hasQuery
                    ? t('noMatches', { query })
                    : only && week
                      ? t('noSessionsThisWeek')
                      : t('noMatchesFilters')}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {hasQuery ? (
                    <RemoveChip analyticsId="roster-empty-clear-search" label={`«${query}»`} onRemove={onClearQuery} />
                ) : null}
                {attention.map((reason) => (
                    <RemoveChip
                        key={reason}
                        analyticsId="roster-empty-clear-attention"
                        label={t(`attentionReason.${reason}`)}
                        onRemove={() => onClearAttention(attention.filter((r) => r !== reason))}
                    />
                ))}
                {week ? (
                    <RemoveChip
                        analyticsId="roster-empty-clear-week"
                        label={t('filterThisWeek')}
                        onRemove={onClearWeek}
                    />
                ) : null}
            </div>

            {axes > 1 ? (
                <TrackedButton
                    analyticsId="roster-empty-clear-all"
                    type="button"
                    onClick={onClearAll}
                    className="mt-4 text-sm text-text-dim underline decoration-text-faint underline-offset-4 transition-colors duration-300 hover:text-text"
                >
                    {t('clearAll')}
                </TrackedButton>
            ) : null}
        </div>
    )
}
