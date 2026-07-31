import { AiProviderConfigAggregate } from '../../../domain/entities/ai-provider-config.entity'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { EncryptedSecretVO } from '../../../domain/value-objects/encrypted-secret.vo'
import type { aiProviderConfigs } from '../schema/ai-provider-configs.schema'

type Row = typeof aiProviderConfigs.$inferSelect
type NewRow = typeof aiProviderConfigs.$inferInsert

export const AiProviderConfigMapper = {
    toDomain(row: Row): AiProviderConfigAggregate {
        return AiProviderConfigAggregate.rehydrate({
            userId: row.userId,
            provider: AiProviderVO.create(row.provider),
            encryptedKey: EncryptedSecretVO.create({
                ciphertext: row.ciphertext,
                iv: row.iv,
                authTag: row.authTag,
            }),
            keyLast4: row.keyLast4,
            model: row.model,
            mesocycleModel: row.mesocycleModel,
            sessionPlanModel: row.sessionPlanModel,
            enabled: row.enabled,
            isDefault: row.isDefault,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })
    },

    toPersistence(config: AiProviderConfigAggregate): NewRow {
        return {
            userId: config.userId,
            provider: config.provider.value,
            ciphertext: config.encryptedKey.ciphertext,
            iv: config.encryptedKey.iv,
            authTag: config.encryptedKey.authTag,
            keyLast4: config.keyLast4,
            model: config.model,
            mesocycleModel: config.mesocycleModel,
            sessionPlanModel: config.sessionPlanModel,
            enabled: config.enabled,
            isDefault: config.isDefault,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        }
    },
}
