import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MesocycleDraftQuery } from '@/lib/graphql/__generated__/graphql'
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

/** An athlete holds at most one open draft, so the key needs no id. */
const draftKey = ['mesocycleDraft']

export interface GenerateMesocycleVariables {
    weeks: number
    trainingDays: number[]
    goal?: string | null
    prompt?: string | null
}

/** The block awaiting a decision, or null. */
export function useMesocycleDraft(enabled: boolean) {
    return useQuery({
        queryKey: draftKey,
        queryFn: async () => (await gqlRequest(MesocycleDraftDocument)).mesocycleDraft,
        enabled,
        retry: false,
    })
}

/**
 * Generating and refining reach the user's provider and take seconds, so the
 * fresh draft is written straight into the cache instead of triggering a refetch
 * that would ask the server for what we already hold.
 */
export function useGenerateMesocycleDraft() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (input: GenerateMesocycleVariables) =>
            (await gqlRequest(GenerateMesocycleDraftDocument, { input })).generateMesocycleDraft,
        onSuccess: (draft) => qc.setQueryData(draftKey, draft),
    })
}

export function useRefineMesocycleDraft() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (input: { draftId: string; message: string }) =>
            (await gqlRequest(RefineMesocycleDraftDocument, { input })).refineMesocycleDraft,
        onSuccess: (draft) => qc.setQueryData(draftKey, draft),
    })
}

/**
 * Accepting writes nothing: it resolves the draft, freeing the athlete's one open
 * slot. The proposal itself is already in hand — the builder is seeded from it —
 * so the cache is simply cleared.
 */
export function useAcceptMesocycleDraft() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (draftId: string) => gqlRequest(AcceptMesocycleDraftDocument, { draftId }),
        onSuccess: () => qc.setQueryData(draftKey, null),
    })
}

export function useDiscardMesocycleDraft() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (draftId: string) => gqlRequest(DiscardMesocycleDraftDocument, { draftId }),
        onSuccess: () => qc.setQueryData(draftKey, null),
    })
}
