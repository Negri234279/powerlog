import type { WorkoutTemplateAggregate } from '../entities/workout-template.entity'

/**
 * Persistence port for the WorkoutTemplate aggregate (template + exercises +
 * sets). `save` upserts the whole tree (children replaced). The Drizzle
 * implementation lives in infrastructure.
 */
export abstract class WorkoutTemplateRepository {
    abstract save(template: WorkoutTemplateAggregate): Promise<void>
    abstract findById(id: string): Promise<WorkoutTemplateAggregate | null>
    /** How many templates a user owns — for the plan's `maxTemplates` cap. */
    abstract countByOwner(ownerId: string): Promise<number>
    abstract delete(id: string): Promise<void>
    /** Delete every template owned by a user (cascades to exercises + sets). Used
     *  to erase workout data on account deletion. */
    abstract deleteAllByOwner(ownerId: string): Promise<void>
}
