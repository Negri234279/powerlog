import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { AiProvider } from '../../../../../shared/ai-provider'
import type { AiProviderConfigAggregate } from '../../../domain/entities/ai-provider-config.entity'
import { AiProviderConfigRepository } from '../../../domain/repositories/ai-provider-config.repository'
import { AiProviderConfigMapper } from '../mappers/ai-provider-config.mapper'
import { aiProviderConfigs } from '../schema/ai-provider-configs.schema'

/** The Drizzle client, or a transaction handle from `db.transaction(...)`. */
type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0]

@Injectable()
export class DrizzleAiProviderConfigRepository extends AiProviderConfigRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findByUserAndProvider(userId: string, provider: AiProvider): Promise<AiProviderConfigAggregate | null> {
        const [row] = await this.db
            .select()
            .from(aiProviderConfigs)
            .where(and(eq(aiProviderConfigs.userId, userId), eq(aiProviderConfigs.provider, provider)))
            .limit(1)

        return row ? AiProviderConfigMapper.toDomain(row) : null
    }

    async findAllByUser(userId: string): Promise<AiProviderConfigAggregate[]> {
        const rows = await this.db.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId))

        return rows.map(AiProviderConfigMapper.toDomain)
    }

    async save(config: AiProviderConfigAggregate): Promise<void> {
        await this.upsert(this.db, config)
    }

    async saveAll(configs: readonly AiProviderConfigAggregate[]): Promise<void> {
        await this.db.transaction(async (tx) => {
            // Clear the stepping-down defaults before setting the new one, or the
            // partial unique index sees two `is_default` rows mid-transaction.
            for (const config of configs.filter((candidate) => !candidate.isDefault)) {
                await this.upsert(tx, config)
            }
            for (const config of configs.filter((candidate) => candidate.isDefault)) {
                await this.upsert(tx, config)
            }
        })
    }

    private async upsert(db: DbOrTx, config: AiProviderConfigAggregate): Promise<void> {
        const row = AiProviderConfigMapper.toPersistence(config)

        await db
            .insert(aiProviderConfigs)
            .values(row)
            .onConflictDoUpdate({
                target: [aiProviderConfigs.userId, aiProviderConfigs.provider],
                set: {
                    ciphertext: row.ciphertext,
                    iv: row.iv,
                    authTag: row.authTag,
                    keyLast4: row.keyLast4,
                    model: row.model,
                    enabled: row.enabled,
                    isDefault: row.isDefault,
                    updatedAt: row.updatedAt,
                },
            })
    }

    async delete(userId: string, provider: AiProvider): Promise<void> {
        await this.db
            .delete(aiProviderConfigs)
            .where(and(eq(aiProviderConfigs.userId, userId), eq(aiProviderConfigs.provider, provider)))
    }

    async deleteAllByUser(userId: string): Promise<void> {
        await this.db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId))
    }
}
