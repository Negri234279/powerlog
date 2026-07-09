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

export const DeleteAiProviderKeyDocument = graphql(`
    mutation DeleteAiProviderKey($provider: String!) {
        deleteAiProviderKey(provider: $provider)
    }
`)
