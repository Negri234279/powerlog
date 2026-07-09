import type { AiProvider } from '../../../../shared/ai-provider'
import type { AiProviderConfigAggregate } from '../entities/ai-provider-config.entity'

/**
 * Persistence port for `AiProviderConfigAggregate`, keyed by the `(userId,
 * provider)` pair. `save` upserts. The Drizzle implementation lives in
 * infrastructure.
 */
export abstract class AiProviderConfigRepository {
    abstract findByUserAndProvider(userId: string, provider: AiProvider): Promise<AiProviderConfigAggregate | null>
    /** Every provider the user has configured, for the settings screen. */
    abstract findAllByUser(userId: string): Promise<AiProviderConfigAggregate[]>
    abstract save(config: AiProviderConfigAggregate): Promise<void>
    abstract delete(userId: string, provider: AiProvider): Promise<void>
    /** Hard-delete every configuration a user owns (account erasure). */
    abstract deleteAllByUser(userId: string): Promise<void>
}
