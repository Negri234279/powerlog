import { graphql } from '@/lib/graphql/__generated__'

/**
 * BYOK provider settings. Note that no operation here ever selects the API key:
 * the API does not expose it — only `keyLast4`, so the UI can show which key is
 * stored without it being readable.
 */
export const MyAiSettingsDocument = graphql(`
    query MyAiSettings {
        myAiSettings {
            provider
            keyLast4
            model
            enabled
            isDefault
            createdAt
            updatedAt
        }
    }
`)

export const AiModelsDocument = graphql(`
    query AiModels($provider: String!) {
        aiModels(provider: $provider) {
            id
            displayName
        }
    }
`)

/** The user's own AI spend, metered per completion and rolled up per model. */
export const MyAiUsageDocument = graphql(`
    query MyAiUsage {
        myAiUsage {
            currency
            rows {
                provider
                model
                inputTokens
                outputTokens
                inputPricePerMTok
                outputPricePerMTok
                totalCost
                requests
                lastUsedAt
            }
            totals {
                inputTokens
                outputTokens
                totalCost
                requests
            }
        }
    }
`)

export const SetAiProviderKeyDocument = graphql(`
    mutation SetAiProviderKey($input: SetAiProviderKeyInput!) {
        setAiProviderKey(input: $input) {
            provider
            keyLast4
            model
            enabled
            createdAt
            updatedAt
        }
    }
`)

export const UpdateAiProviderModelDocument = graphql(`
    mutation UpdateAiProviderModel($input: UpdateAiProviderModelInput!) {
        updateAiProviderModel(input: $input) {
            provider
            keyLast4
            model
            enabled
        }
    }
`)

export const SetAiProviderEnabledDocument = graphql(`
    mutation SetAiProviderEnabled($input: SetAiProviderEnabledInput!) {
        setAiProviderEnabled(input: $input) {
            provider
            keyLast4
            model
            enabled
        }
    }
`)

export const SetAiProviderDefaultDocument = graphql(`
    mutation SetAiProviderDefault($provider: String!) {
        setAiProviderDefault(provider: $provider) {
            provider
            isDefault
        }
    }
`)

export const DeleteAiProviderKeyDocument = graphql(`
    mutation DeleteAiProviderKey($provider: String!) {
        deleteAiProviderKey(provider: $provider)
    }
`)
