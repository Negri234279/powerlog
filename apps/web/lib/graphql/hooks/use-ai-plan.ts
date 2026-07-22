import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { SessionPlanDraftQuery } from '@/lib/graphql/__generated__/graphql'
import { waitForGeneration } from '@/lib/graphql/ai-generation'
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

/** `entryId` programs a single exercise; omit it for the whole session. */
export interface GeneratePlanVariables {
    entryId?: string | null
    extraInfo?: string | null
}

/**
 * The draft the finished job produced. Read back rather than returned by the
 * mutation: the API answers with a job now, because the provider takes 20–30s.
 */
async function draftOf(sessionId: string): Promise<AiPlanDraft | null> {
    return (await gqlRequest(SessionPlanDraftDocument, { sessionId })).sessionPlanDraft ?? null
}

/**
 * Generating and refining queue a job and then wait for it. The mutation stays
 * pending for the whole wait — which is what the athlete is doing — but the
 * browser is no longer holding a 30-second request open: the work belongs to the
 * server now, and closing the tab or losing the network no longer throws it away.
 *
 * A job that fails rejects with the API's code, so the panel's existing error
 * handling (upgrade CTA vs message) keeps working unchanged.
 */
export function useGenerateSessionPlanDraft(sessionId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (variables: GeneratePlanVariables = {}) => {
            const queued = await gqlRequest(GenerateSessionPlanDraftDocument, {
                input: { sessionId, ...variables },
            })
            await waitForGeneration(queued.generateSessionPlanDraft.id)

            return draftOf(sessionId)
        },
        onSuccess: (draft) => qc.setQueryData(draftKey(sessionId), draft),
    })
}

export function useRefinePlanDraft(sessionId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (input: { draftId: string; message: string }) => {
            const queued = await gqlRequest(RefinePlanDraftDocument, { input })
            await waitForGeneration(queued.refinePlanDraft.id)

            return draftOf(sessionId)
        },
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
