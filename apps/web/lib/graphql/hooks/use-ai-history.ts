import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import type { AiDraftHistoryQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import { AiDraftHistoryDocument } from '@/lib/graphql/operations/ai-history'

export type AiDraftSummary = AiDraftHistoryQuery['aiDraftHistory']['items'][number]

/** The two kinds of thing the model designs, plus "everything". */
export type AiDraftKindFilter = 'all' | 'session' | 'mesocycle'

export interface AiHistoryFilters {
    kind?: AiDraftKindFilter
    /** Only drafts programming this session — what the session panel links to. */
    sessionId?: string
}

const PAGE_SIZE = 20

/** `all` is the absence of a filter, not a value the API knows. */
const kindArg = (kind?: AiDraftKindFilter) => (kind && kind !== 'all' ? kind : undefined)

/**
 * Keyset-paginated AI conversation history (newest activity first). Session and
 * mesocycle drafts arrive as one merged feed; `kind` narrows it.
 */
export function useAiDraftHistory(filters: AiHistoryFilters = {}) {
    const kind = kindArg(filters.kind)

    return useInfiniteQuery({
        queryKey: ['aiDraftHistory', { kind: kind ?? 'all', sessionId: filters.sessionId ?? null }],
        queryFn: ({ pageParam }) =>
            // Omit the cursor on the first page — the API's zod arg accepts
            // `string | undefined`, not an explicit null.
            gqlRequest(AiDraftHistoryDocument, {
                limit: PAGE_SIZE,
                kind,
                sessionId: filters.sessionId,
                cursor: pageParam ?? undefined,
            }).then((r) => r.aiDraftHistory),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => (last.hasNextPage ? last.nextCursor : undefined),
        // Keep the current rows on screen while a new filter loads, so switching
        // filters refreshes in place instead of flashing a skeleton over results
        // the user is already reading.
        placeholderData: keepPreviousData,
    })
}

/**
 * How many past conversations exist for one session — the count on the panels'
 * "previous" link. Deliberately not a total: the feed carries no count, and one
 * small page answers the only question the affordance asks — is there anything
 * back there, and roughly how much.
 */
export function useAiDraftCount(filters: AiHistoryFilters = {}) {
    const kind = kindArg(filters.kind)

    return useQuery({
        queryKey: ['aiDraftCount', { kind: kind ?? 'all', sessionId: filters.sessionId ?? null }],
        queryFn: () =>
            gqlRequest(AiDraftHistoryDocument, { limit: 10, kind, sessionId: filters.sessionId }).then((r) => ({
                count: r.aiDraftHistory.items.length,
                more: r.aiDraftHistory.hasNextPage,
            })),
    })
}
