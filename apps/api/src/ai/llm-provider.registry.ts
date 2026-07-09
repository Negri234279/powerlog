import { Injectable } from '@nestjs/common'

import { UnsupportedProviderError } from './ai.errors'
import { type AiProvider, LlmProviderClient } from './llm-provider.port'

/**
 * Resolves a provider name to its client. Injected by anything that needs to
 * call an LLM, so callers depend on the provider *name* (which is what the user
 * configured and what the database stores) rather than on a concrete adapter.
 */
@Injectable()
export class LlmProviderRegistry {
    private readonly clients: ReadonlyMap<AiProvider, LlmProviderClient>

    constructor(clients: LlmProviderClient[]) {
        this.clients = new Map(clients.map((client) => [client.provider, client]))
    }

    /** Throws `UnsupportedProviderError` when no adapter is registered. */
    for(provider: AiProvider): LlmProviderClient {
        const client = this.clients.get(provider)
        if (!client) throw new UnsupportedProviderError(provider)

        return client
    }
}
