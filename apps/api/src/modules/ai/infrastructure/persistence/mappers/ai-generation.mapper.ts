import { AiGenerationAggregate } from '../../../domain/entities/ai-generation.entity'
import { GenerationKindVO } from '../../../domain/value-objects/generation-kind.vo'
import { GenerationStatusVO } from '../../../domain/value-objects/generation-status.vo'
import type { aiGenerations } from '../schema/ai-generations.schema'

type GenerationRow = typeof aiGenerations.$inferSelect

export const AiGenerationMapper = {
    /**
     * `request` is jsonb, so its shape is whatever was last written there — the
     * column type is a compile-time claim, not a runtime one. `rehydrate` re-asserts
     * that it matches its `kind` rather than trusting the cast.
     */
    toDomain(row: GenerationRow): AiGenerationAggregate {
        return AiGenerationAggregate.rehydrate({
            id: row.id,
            userId: row.userId,
            kind: GenerationKindVO.create(row.kind),
            status: GenerationStatusVO.create(row.status),
            request: row.request,
            draftId: row.draftId,
            failureCode: row.failureCode,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })
    },

    toPersistence(generation: AiGenerationAggregate): typeof aiGenerations.$inferInsert {
        return {
            id: generation.id,
            userId: generation.userId,
            kind: generation.kind.value,
            status: generation.status.value,
            request: generation.request,
            draftId: generation.draftId,
            failureCode: generation.failureCode,
            // Derived, never set by the caller: the aggregate decides what a job of
            // this shape occupies.
            scopeKey: generation.scopeKey,
            createdAt: generation.createdAt,
            updatedAt: generation.updatedAt,
        }
    },
}
