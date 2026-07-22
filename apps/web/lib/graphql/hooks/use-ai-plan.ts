import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { SessionPlanDraftQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AcceptPlanDraftDocument,
    DiscardPlanDraftDocument,
    GenerateSessionPlanDraftDocument,
    RefinePlanDraftDocument,
    SessionPlanDraftDocument,
} from '@/lib/graphql/operations/ai-plan'

export type AiPlanDraft = NonNullable<SessionPlanDraftQuery['sessionPlanDraft']>

const draftKey = (sessionId: string) => ['sessionPlanDraft', sessionId]

/** The proposal awaiting a decision on this session, or null. */
export function useSessionPlanDraft(sessionId: string, enabled: boolean) {
    return useQuery({
        queryKey: draftKey(sessionId),
        queryFn: async () => (await gqlRequest(SessionPlanDraftDocument, { sessionId })).sessionPlanDraft,
        enabled,
        retry: false,
    })
}

/**
 * Generating and refining reach the user's provider and take seconds, so the
 * fresh draft is written straight into the cache instead of triggering a refetch
 * that would ask the server for what we already hold.
 */
/** `entryId` programs a single exercise; omit it for the whole session. */
export interface GeneratePlanVariables {
    entryId?: string | null
    extraInfo?: string | null
}

export function useGenerateSessionPlanDraft(sessionId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (variables: GeneratePlanVariables = {}) =>
            (await gqlRequest(GenerateSessionPlanDraftDocument, { input: { sessionId, ...variables } }))
                .generateSessionPlanDraft,
        onSuccess: (draft) => qc.setQueryData(draftKey(sessionId), draft),
    })
}

export function useRefinePlanDraft(sessionId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (input: { draftId: string; message: string }) =>
            (await gqlRequest(RefinePlanDraftDocument, { input })).refinePlanDraft,
        onSuccess: (draft) => qc.setQueryData(draftKey(sessionId), draft),
    })
}

/**
 * Resolving a draft moves it out of the session and into the history. Both are
 * stale afterwards, so both are invalidated — otherwise the "previous plans"
 * link keeps showing a count taken before the draft was resolved, and only a
 * manual reload brings it up to date.
 */
function onDraftResolved(qc: ReturnType<typeof useQueryClient>, sessionId: string): void {
    qc.setQueryData(draftKey(sessionId), null)
    void qc.invalidateQueries({ queryKey: ['aiDraftCount'] })
    void qc.invalidateQueries({ queryKey: ['aiDraftHistory'] })
}

/** Accepting writes the targets onto the session, so its cache is stale too. */
export function useAcceptPlanDraft(sessionId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (draftId: string) => gqlRequest(AcceptPlanDraftDocument, { draftId }),
        onSuccess: () => {
            onDraftResolved(qc, sessionId)
            void qc.invalidateQueries({ queryKey: ['workoutSession', sessionId] })
        },
    })
}

export function useDiscardPlanDraft(sessionId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (draftId: string) => gqlRequest(DiscardPlanDraftDocument, { draftId }),
        onSuccess: () => onDraftResolved(qc, sessionId),
    })
}
