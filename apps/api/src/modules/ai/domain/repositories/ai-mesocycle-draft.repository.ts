import type { AiMesocycleDraftAggregate } from '../entities/ai-mesocycle-draft.entity'

/**
 * Persistence port for `AiMesocycleDraftAggregate`. `save` upserts the draft
 * together with its messages — they belong to the aggregate, so they are written
 * as one. The proposed week rides along in a jsonb column: it is read and
 * replaced whole, never queried by field.
 */
export abstract class AiMesocycleDraftRepository {
    abstract findById(id: string): Promise<AiMesocycleDraftAggregate | null>
    /**
     * The draft still awaiting a decision for one (owner, trainee) pair, if any.
     * `athleteId` null → the owner's own block; set → the one a coach is designing
     * for that athlete. At most one exists per pair.
     */
    abstract findOpenByUser(userId: string, athleteId: string | null): Promise<AiMesocycleDraftAggregate | null>
    abstract save(draft: AiMesocycleDraftAggregate): Promise<void>
    /** Hard-delete every draft a user owns (account erasure). */
    abstract deleteAllByUser(userId: string): Promise<void>
}
