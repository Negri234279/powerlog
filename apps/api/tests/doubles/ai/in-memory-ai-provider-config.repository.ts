import type { AiProvider } from '../../../src/shared/ai-provider'
import type { AiProviderConfigAggregate } from '../../../src/modules/ai/domain/entities/ai-provider-config.entity'
import { AiProviderConfigRepository } from '../../../src/modules/ai/domain/repositories/ai-provider-config.repository'

const keyOf = (userId: string, provider: AiProvider) => `${userId}:${provider}`

/** In-memory implementation of the real port, keyed by (userId, provider). */
export class InMemoryAiProviderConfigRepository extends AiProviderConfigRepository {
    private readonly rows = new Map<string, AiProviderConfigAggregate>()

    /** Pre-populate the repository for a test's arrange step. */
    seed(...configs: AiProviderConfigAggregate[]): void {
        for (const config of configs) {
            this.rows.set(keyOf(config.userId, config.provider.value), config)
        }
    }

    all(): AiProviderConfigAggregate[] {
        return [...this.rows.values()]
    }

    async findByUserAndProvider(userId: string, provider: AiProvider): Promise<AiProviderConfigAggregate | null> {
        return this.rows.get(keyOf(userId, provider)) ?? null
    }

    async findAllByUser(userId: string): Promise<AiProviderConfigAggregate[]> {
        return this.all().filter((config) => config.userId === userId)
    }

    async save(config: AiProviderConfigAggregate): Promise<void> {
        this.rows.set(keyOf(config.userId, config.provider.value), config)
    }

    async delete(userId: string, provider: AiProvider): Promise<void> {
        this.rows.delete(keyOf(userId, provider))
    }

    async deleteAllByUser(userId: string): Promise<void> {
        for (const config of this.all()) {
            if (config.userId === userId) this.rows.delete(keyOf(userId, config.provider.value))
        }
    }
}
