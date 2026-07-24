import type { AiGenerationAggregate } from '../entities/ai-generation.entity'

/**
 * Persistence port for `AiGenerationAggregate`. The scope lookup is what makes
 * queueing idempotent: before spending the athlete's provider credit, the caller
 * asks whether the same thing is already in flight.
 */
export abstract class AiGenerationRepository {
    abstract findById(id: string): Promise<AiGenerationAggregate | null>
    /**
     * The generation still queued or running for a scope, if any — at most one
     * exists, which a partial unique index enforces rather than trusts.
     */
    abstract findUnsettledByScope(scopeKey: string): Promise<AiGenerationAggregate | null>
    abstract save(generation: AiGenerationAggregate): Promise<void>
    /** Hard-delete every generation a user owns (account erasure). */
    abstract deleteAllByUser(userId: string): Promise<void>
}
