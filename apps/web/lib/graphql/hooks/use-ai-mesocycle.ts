import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MesocycleDraftQuery } from '@/lib/graphql/__generated__/graphql'
import { waitForGeneration } from '@/lib/graphql/ai-generation'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AcceptMesocycleDraftDocument,
    DiscardMesocycleDraftDocument,
    GenerateMesocycleDraftDocument,
    MesocycleDraftDocument,
    RefineMesocycleDraftDocument,
} from '@/lib/graphql/operations/ai-mesocycle'

export type AiMesocycleDraft = NonNullable<MesocycleDraftQuery['mesocycleDraft']>
export type AiMesocycleDraftDay = AiMesocycleDraft['days'][number]

/**
 * One open draft per trainee: your own (`null`) and one per athlete a coach is
 * designing for. Keying the cache by trainee is what keeps a block designed off
 * Ana's numbers from being seeded into Luis's builder.
 */
const draftKey = (athleteId?: string) => ['mesocycleDraft', athleteId ?? null] as const

export interface GenerateMesocycleVariables {
    weeks: number
    trainingDays: number[]
    goal?: string | null
    prompt?: string | null
    /** Set when a coach designs for one of their athletes. */
    athleteId?: string
}

/** The block awaiting a decision for this trainee, or null. */
export function useMesocycleDraft(enabled: boolean, athleteId?: string) {
    return useQuery({
        queryKey: draftKey(athleteId),
        queryFn: async () => (await gqlRequest(MesocycleDraftDocument, { athleteId })).mesocycleDraft,
        enabled,
        retry: false,
    })
}

/**
 * The block the finished job designed. Read back rather than returned by the
 * mutation: the API answers with a job now, because designing a week is the
 * slowest of the AI calls.
 */
async function draftOf(athleteId?: string): Promise<AiMesocycleDraft | null> {
    return (await gqlRequest(MesocycleDraftDocument, { athleteId })).mesocycleDraft ?? null
}

/**
 * Generating and refining queue a job and then wait for it. The mutation stays
 * pending for the whole wait — which is what the athlete is doing — but the
 * browser no longer holds a minute-long request open: the work belongs to the
 * server, and leaving the page no longer throws away what was already paid for.
 *
 * A job that fails rejects with the API's code, so the existing error handling
 * (upgrade CTA vs message) keeps working unchanged.
 */
export function useGenerateMesocycleDraft() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (input: GenerateMesocycleVariables) => {
            const queued = await gqlRequest(GenerateMesocycleDraftDocument, { input })
            await waitForGeneration(queued.generateMesocycleDraft.id)

            return draftOf(input.athleteId)
        },
        onSuccess: (draft, input) => qc.setQueryData(draftKey(input.athleteId), draft),
    })
}

export function useRefineMesocycleDraft(athleteId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (input: { draftId: string; message: string }) => {
            const queued = await gqlRequest(RefineMesocycleDraftDocument, { input })
            await waitForGeneration(queued.refineMesocycleDraft.id)

            return draftOf(athleteId)
        },
        onSuccess: (draft) => qc.setQueryData(draftKey(athleteId), draft),
    })
}

/**
 * Accepting writes nothing: it resolves the draft, freeing the athlete's one open
 * slot. The proposal itself is already in hand — the builder is seeded from it —
 * so the cache is simply cleared.
 */
/**
 * Resolving a draft moves it out of the builder and into the history, so the
 * history and its counts are stale — see the session panel's twin.
 */
function onDraftResolved(qc: ReturnType<typeof useQueryClient>, athleteId?: string): void {
    qc.setQueryData(draftKey(athleteId), null)
    void qc.invalidateQueries({ queryKey: ['aiDraftCount'] })
    void qc.invalidateQueries({ queryKey: ['aiDraftHistory'] })
}

export function useAcceptMesocycleDraft(athleteId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (draftId: string) => gqlRequest(AcceptMesocycleDraftDocument, { draftId }),
        onSuccess: () => onDraftResolved(qc, athleteId),
    })
}

export function useDiscardMesocycleDraft(athleteId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (draftId: string) => gqlRequest(DiscardMesocycleDraftDocument, { draftId }),
        onSuccess: () => onDraftResolved(qc, athleteId),
    })
}
