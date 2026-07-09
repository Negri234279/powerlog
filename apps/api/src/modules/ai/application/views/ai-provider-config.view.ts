import type { AiProviderConfigAggregate } from '../../domain/entities/ai-provider-config.entity'

/**
 * What the client is allowed to know about a stored provider configuration.
 * Note what is absent: the API key, in any form. Only `keyLast4` leaves the
 * server, so the user can tell which key is stored without it being readable.
 */
export interface AiProviderConfigView {
    provider: string
    keyLast4: string
    model: string | null
    enabled: boolean
    createdAt: Date
    updatedAt: Date
}

export function toAiProviderConfigView(config: AiProviderConfigAggregate): AiProviderConfigView {
    return {
        provider: config.provider.value,
        keyLast4: config.keyLast4,
        model: config.model,
        enabled: config.enabled,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
    }
}
