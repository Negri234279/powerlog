import type { AiMesocycleDraftAggregate } from '../entities/ai-mesocycle-draft.entity'

/**
 * Persistence port for `AiMesocycleDraftAggregate`. `save` upserts the draft
 * together with its messages — they belong to the aggregate, so they are written
 * as one. The proposed week rides along in a jsonb column: it is read and
 * replaced whole, never queried by field.
 */
export abstract class AiMesocycleDraftRepository {
    abstract findById(id: string): Promise<AiMesocycleDraftAggregate | null>
    /** The user's draft still awaiting a decision, if any. At most one exists. */
    abstract findOpenByUser(userId: string): Promise<AiMesocycleDraftAggregate | null>
    abstract save(draft: AiMesocycleDraftAggregate): Promise<void>
    /** Hard-delete every draft a user owns (account erasure). */
    abstract deleteAllByUser(userId: string): Promise<void>
}
