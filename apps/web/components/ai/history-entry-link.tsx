'use client'

import { useTranslations } from 'next-intl'

import { useAiDraftCount } from '@/lib/graphql/hooks/use-ai-history'
import { TrackedLink } from '@/components/ui/tracked'

/**
 * The way back to past conversations, from the panel that creates them — which
 * is exactly where "where did my old one go?" gets asked.
 *
 * Renders **nothing** until there is something to point at. A secondary
 * affordance never earns a skeleton, and "Previous · 0" is a dead end that
 * teaches people the feature is empty.
 *
 * The count is one small page, not a total: the feed carries no total, and past
 * about nine the exact number stops mattering.
 */
export function HistoryEntryLink({
    kind,
    sessionId,
    analyticsId,
}: {
    kind: 'session' | 'mesocycle'
    sessionId?: string
    analyticsId: string
}) {
    const t = useTranslations('aiHistory')
    const { data } = useAiDraftCount({ kind, sessionId })

    if (!data || data.count === 0) return null

    const href = sessionId ? `/workouts/ai?kind=${kind}&sessionId=${sessionId}` : `/workouts/ai?kind=${kind}`

    return (
        <TrackedLink
            analyticsId={analyticsId}
            href={href}
            className="whitespace-nowrap text-sm text-text-dim transition-colors duration-300 hover:text-text"
        >
            {t('previous', { count: data.more ? `${data.count}+` : `${data.count}` })}
        </TrackedLink>
    )
}
