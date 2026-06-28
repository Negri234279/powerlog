import type { WorkoutSessionAggregate } from '../entities/workout-session.entity'

/**
 * Persistence port for the WorkoutSession aggregate (session + entries + sets).
 * `save` upserts the whole tree. The Drizzle implementation lives in infrastructure.
 */
export abstract class WorkoutSessionRepository {
    abstract save(session: WorkoutSessionAggregate): Promise<void>
    abstract findById(id: string): Promise<WorkoutSessionAggregate | null>
    abstract delete(id: string): Promise<void>
    /** Delete every session owned by a user (cascades to entries + sets). Used to
     *  erase workout data on account deletion. Sessions a coach planned for an
     *  athlete are owned by the athlete, so they're untouched when the coach leaves. */
    abstract deleteAllByUser(userId: string): Promise<void>
}
