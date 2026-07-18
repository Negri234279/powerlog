import type { MesocycleAggregate } from '../entities/mesocycle.entity'

/**
 * Persistence port for the Mesocycle aggregate (mesocycle + microcycles + days +
 * exercises + sets). `save` upserts the whole tree (children replaced). The
 * Drizzle implementation lives in infrastructure.
 */
export abstract class MesocycleRepository {
    abstract save(mesocycle: MesocycleAggregate): Promise<void>
    abstract findById(id: string): Promise<MesocycleAggregate | null>
    /** How many mesocycles a user created for themselves (excludes ones a coach
     *  planned for them) — for the athlete plan's `maxMesocycles` cap. */
    abstract countSelfCreatedBy(userId: string): Promise<number>
    /** How many blocks a coach designed for their athletes — for the coach plan's
     *  `maxMesocycles` cap (the coaching counterpart of {@link countSelfCreatedBy}). */
    abstract countPlannedForAthletesBy(coachId: string): Promise<number>
    abstract delete(id: string): Promise<void>
    /** Delete every mesocycle owned by a user (cascades to the whole tree). Used
     *  to erase workout data on account deletion. */
    abstract deleteAllByOwner(ownerId: string): Promise<void>
}
