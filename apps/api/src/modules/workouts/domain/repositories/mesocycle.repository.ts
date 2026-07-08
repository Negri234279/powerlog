import type { MesocycleAggregate } from '../entities/mesocycle.entity'

/**
 * Persistence port for the Mesocycle aggregate (mesocycle + microcycles + days +
 * exercises + sets). `save` upserts the whole tree (children replaced). The
 * Drizzle implementation lives in infrastructure.
 */
export abstract class MesocycleRepository {
    abstract save(mesocycle: MesocycleAggregate): Promise<void>
    abstract findById(id: string): Promise<MesocycleAggregate | null>
    abstract delete(id: string): Promise<void>
    /** Delete every mesocycle owned by a user (cascades to the whole tree). Used
     *  to erase workout data on account deletion. */
    abstract deleteAllByOwner(ownerId: string): Promise<void>
}
