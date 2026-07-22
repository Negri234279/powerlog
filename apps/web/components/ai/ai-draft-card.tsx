'use client'

import { useLocale, useTranslations } from 'next-intl'

import type { AiDraftSummary } from '@/lib/graphql/hooks/use-ai-history'
import { draftTitle } from '@/lib/ai/draft-title'
import { formatSessionDate } from '@/lib/format-date'
import { TrackedLink } from '@/components/ui/tracked'
import { AiDraftAthleteChip, AiDraftKindChip, AiDraftStatusChip } from './ai-draft-chips'
import { AiDraftTitle } from './ai-draft-title'

/**
 * One line of the history. The whole card is a single link — a row with nested
 * controls is a worse tap target on a phone, and there are no per-row actions:
 * a resolved draft is immutable, and the only thing you do with one is open it.
 */
export function AiDraftCard({ draft, athleteName }: { draft: AiDraftSummary; athleteName?: string }) {
    const t = useTranslations('aiHistory')
    const tk = useTranslations('aiHistory.kind')
    const ts = useTranslations('aiHistory.status')
    const tu = useTranslations('aiHistory.untitled')
    const locale = useLocale()

    const title = draftTitle(draft)
    const titleText = title.kind === 'none' ? tu(title.of) : title.text
    // A screen-reader user scanning a dozen links called "Heavy squat day" learns
    // nothing; the accessible name carries what the mono line shows sighted users.
    const label = t('cardAria', {
        status: ts(draft.status),
        kind: tk(draft.kind),
        title: titleText,
        model: draft.model,
    })

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline transition-all duration-300 hover:ring-text/20">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface">
                <TrackedLink
                    analyticsId="ai-history-draft-open"
                    href={`/workouts/ai/${draft.id}`}
                    aria-label={label}
                    className="block p-5"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <AiDraftStatusChip status={draft.status} />
                        <AiDraftKindChip kind={draft.kind} />
                        {athleteName ? <AiDraftAthleteChip name={athleteName} /> : null}
                    </div>

                    <AiDraftTitle
                        draft={draft}
                        className="mt-3 line-clamp-2 block font-display text-lg tracking-tight"
                    />

                    {/* The proposed block name, when it isn't already the title. */}
                    {draft.name && title.kind !== 'name' ? (
                        <p className="mt-0.5 truncate text-sm text-text-dim">{draft.name}</p>
                    ) : null}

                    <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {/* The model is the first thing sacrificed when space runs
                            out; it stays in the aria-label and on the detail view. */}
                        <span className="hidden sm:inline">{draft.model} · </span>
                        {t('messages', { count: draft.messageCount })} ·{' '}
                        <time dateTime={draft.updatedAt}>{formatSessionDate(draft.updatedAt, locale)}</time>
                    </p>
                </TrackedLink>
            </div>
        </div>
    )
}
