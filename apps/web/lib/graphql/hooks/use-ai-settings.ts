import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MyAiSettingsQuery, MyAiUsageQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AiModelsDocument,
    DeleteAiProviderKeyDocument,
    MyAiSettingsDocument,
    MyAiUsageDocument,
    SetAiProviderDefaultDocument,
    SetAiProviderEnabledDocument,
    SetAiProviderKeyDocument,
    UpdateAiProviderModelDocument,
} from '@/lib/graphql/operations/ai'

/** The providers powerlog can talk to. Mirrors the API's `AI_PROVIDERS`. */
export const AI_PROVIDERS = ['openai', 'anthropic'] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]

export type AiProviderConfig = MyAiSettingsQuery['myAiSettings'][number]

export type AiUsageSummary = MyAiUsageQuery['myAiUsage']
export type AiUsageRow = AiUsageSummary['rows'][number]

export function useMyAiSettings() {
    return useQuery({
        queryKey: ['myAiSettings'],
        queryFn: async () => (await gqlRequest(MyAiSettingsDocument)).myAiSettings,
        retry: false,
    })
}

/** The user's own spend, rolled up per model. Read-only; refetched on focus. */
export function useMyAiUsage() {
    return useQuery({
        queryKey: ['myAiUsage'],
        queryFn: async () => (await gqlRequest(MyAiUsageDocument)).myAiUsage,
        retry: false,
    })
}

/**
 * Lazy: every call reaches the provider with the user's key, so it only runs
 * once a card is actually showing its model picker. Models change rarely, so
 * the result is worth keeping for a while.
 */
export function useAiModels(provider: AiProvider, enabled: boolean) {
    return useQuery({
        queryKey: ['aiModels', provider],
        queryFn: async () => (await gqlRequest(AiModelsDocument, { provider })).aiModels,
        enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}

function useAiSettingsMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['myAiSettings'] })
        },
    })
}

export function useSetAiProviderKey() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (input: { provider: AiProvider; apiKey: string; model?: string | null }) =>
            gqlRequest(SetAiProviderKeyDocument, { input }),
        onSuccess: (_data, variables) => {
            void qc.invalidateQueries({ queryKey: ['myAiSettings'] })
            // A new key may reach a different set of models than the old one.
            void qc.invalidateQueries({ queryKey: ['aiModels', variables.provider] })
        },
    })
}

export function useUpdateAiProviderModel() {
    return useAiSettingsMutation((input: { provider: AiProvider; model: string | null }) =>
        gqlRequest(UpdateAiProviderModelDocument, { input }),
    )
}

export function useSetAiProviderEnabled() {
    return useAiSettingsMutation((input: { provider: AiProvider; enabled: boolean }) =>
        gqlRequest(SetAiProviderEnabledDocument, { input }),
    )
}

/** Promoting one provider demotes the other, so refetch the whole list. */
export function useSetAiProviderDefault() {
    return useAiSettingsMutation((provider: AiProvider) => gqlRequest(SetAiProviderDefaultDocument, { provider }))
}

export function useDeleteAiProviderKey() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (provider: AiProvider) => gqlRequest(DeleteAiProviderKeyDocument, { provider }),
        onSuccess: (_data, provider) => {
            void qc.invalidateQueries({ queryKey: ['myAiSettings'] })
            void qc.removeQueries({ queryKey: ['aiModels', provider] })
        },
    })
}
