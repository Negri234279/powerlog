import type { AiPlanDraftAggregate } from '../entities/ai-plan-draft.entity'

/**
 * Persistence port for `AiPlanDraftAggregate`. `save` upserts the draft together
 * with its sets and messages — they belong to the aggregate, so they are written
 * as one.
 */
export abstract class AiPlanDraftRepository {
    abstract findById(id: string): Promise<AiPlanDraftAggregate | null>
    /** The session's draft still awaiting a decision, if any. */
    abstract findOpenBySession(userId: string, sessionId: string): Promise<AiPlanDraftAggregate | null>
    abstract save(draft: AiPlanDraftAggregate): Promise<void>
    /** Hard-delete every draft a user owns (account erasure). */
    abstract deleteAllByUser(userId: string): Promise<void>
}
