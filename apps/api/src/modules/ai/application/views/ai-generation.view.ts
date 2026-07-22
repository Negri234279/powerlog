import type { AiGenerationAggregate } from '../../domain/entities/ai-generation.entity'

export interface AiGenerationView {
    id: string
    kind: string
    status: string
    /** The draft it produced; null until it succeeds. */
    draftId: string | null
    /** The stable code of what stopped it; null unless it failed. */
    failureCode: string | null
    createdAt: Date
    updatedAt: Date
}

export function toAiGenerationView(generation: AiGenerationAggregate): AiGenerationView {
    return {
        id: generation.id,
        kind: generation.kind.value,
        status: generation.status.value,
        draftId: generation.draftId,
        failureCode: generation.failureCode,
        createdAt: generation.createdAt,
        updatedAt: generation.updatedAt,
    }
}
