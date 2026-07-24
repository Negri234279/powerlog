import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AiDraftHistoryQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AiDraftHistoryDocument,
    ForkMesocycleDraftDocument,
    ForkPlanDraftDocument,
} from '@/lib/graphql/operations/ai-history'

export type AiDraftSummary = AiDraftHistoryQuery['aiDraftHistory']['items'][number]

/** The two kinds of thing the model designs, plus "everything". */
export type AiDraftKindFilter = 'all' | 'session' | 'mesocycle'

export interface AiHistoryFilters {
    kind?: AiDraftKindFilter
    /** Only drafts programming this session — what the session panel links to. */
    sessionId?: string
    /** An athlete's id, or `'self'` for the caller's own blocks. */
    athleteId?: string
    status?: 'open' | 'accepted' | 'discarded'
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
        queryKey: [
            'aiDraftHistory',
            {
                kind: kind ?? 'all',
                sessionId: filters.sessionId ?? null,
                athleteId: filters.athleteId ?? null,
                status: filters.status ?? null,
            },
        ],
        queryFn: ({ pageParam }) =>
            // Omit the cursor on the first page — the API's zod arg accepts
            // `string | undefined`, not an explicit null.
            gqlRequest(AiDraftHistoryDocument, {
                limit: PAGE_SIZE,
                kind,
                sessionId: filters.sessionId,
                athleteId: filters.athleteId,
                status: filters.status,
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
 * How many *past* conversations exist for one session — the count on the panels'
 * "previous" link. Deliberately not a total: the feed carries no count, and one
 * small page answers the only question the affordance asks — is there anything
 * back there, and roughly how much.
 *
 * Open drafts are excluded, and that is the whole point of the word "previous":
 * the draft the panel is showing right now is not somewhere to go back to. It is
 * filtered client-side because the API takes one status, and "resolved" is two.
 */
export function useAiDraftCount(filters: AiHistoryFilters = {}) {
    const kind = kindArg(filters.kind)

    return useQuery({
        queryKey: ['aiDraftCount', { kind: kind ?? 'all', sessionId: filters.sessionId ?? null }],
        queryFn: () =>
            gqlRequest(AiDraftHistoryDocument, { limit: 10, kind, sessionId: filters.sessionId }).then((r) => ({
                count: r.aiDraftHistory.items.filter((draft) => draft.status !== 'open').length,
                more: r.aiDraftHistory.hasNextPage,
            })),
    })
}

/**
 * The draft still open on the same target as `filters`, if any — a session, or a
 * (coach, athlete) pair for a block.
 *
 * The API supersedes it silently when a fork lands, which is the right server
 * behaviour but the wrong thing to do to a user without warning. This is what
 * lets the UI say *what* it is about to replace, before replacing it.
 */
export function useOpenDraftFor(filters: AiHistoryFilters, enabled = true) {
    const kind = kindArg(filters.kind)

    return useQuery({
        queryKey: [
            'aiOpenDraft',
            { kind: kind ?? 'all', sessionId: filters.sessionId ?? null, athleteId: filters.athleteId ?? null },
        ],
        queryFn: () =>
            gqlRequest(AiDraftHistoryDocument, {
                limit: 1,
                kind,
                status: 'open',
                sessionId: filters.sessionId,
                athleteId: filters.athleteId,
            }).then((r) => r.aiDraftHistory.items[0] ?? null),
        enabled,
    })
}

/**
 * Pick a conversation back up. Costs no model call — the fork is an open draft
 * carrying the old proposal, which the panels then refine the ordinary way.
 *
 * Everything the fork touched is invalidated: the history (a new row, and the
 * superseded draft's status changed under us), the open-draft probes, and the
 * live draft key of whichever panel now owns it.
 */
export function useForkAiDraft() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (draft: { id: string; kind: string }) =>
            draft.kind === 'mesocycle'
                ? {
                      kind: 'mesocycle' as const,
                      draft: (await gqlRequest(ForkMesocycleDraftDocument, { draftId: draft.id })).forkMesocycleDraft,
                  }
                : {
                      kind: 'session' as const,
                      draft: (await gqlRequest(ForkPlanDraftDocument, { draftId: draft.id })).forkPlanDraft,
                  },
        onSuccess: (result) => {
            void queryClient.invalidateQueries({ queryKey: ['aiDraftHistory'] })
            void queryClient.invalidateQueries({ queryKey: ['aiDraftCount'] })
            void queryClient.invalidateQueries({ queryKey: ['aiOpenDraft'] })

            if (result.kind === 'session') {
                void queryClient.invalidateQueries({ queryKey: ['sessionPlanDraft', result.draft.sessionId] })
            } else {
                void queryClient.invalidateQueries({ queryKey: ['aiMesocycleDraft'] })
            }
        },
    })
}
