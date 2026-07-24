import type { WorkoutSessionAggregate } from '../entities/workout-session.entity'

/**
 * Persistence port for the WorkoutSession aggregate (session + entries + sets).
 * `save` upserts the whole tree. The Drizzle implementation lives in infrastructure.
 */
export abstract class WorkoutSessionRepository {
    abstract save(session: WorkoutSessionAggregate): Promise<void>
    abstract findById(id: string): Promise<WorkoutSessionAggregate | null>
    /** How many ad-hoc workouts a user logged for themselves — excludes sessions a
     *  coach planned and those generated inside a mesocycle. For the `maxWorkouts` cap. */
    abstract countSelfCreatedBy(userId: string): Promise<number>
    abstract delete(id: string): Promise<void>
    /** Delete every session owned by a user (cascades to entries + sets). Used to
     *  erase workout data on account deletion. Sessions a coach planned for an
     *  athlete are owned by the athlete, so they're untouched when the coach leaves. */
    abstract deleteAllByUser(userId: string): Promise<void>
    /** 1-based weeks of a mesocycle that already have generated sessions (ascending). */
    abstract generatedWeeks(mesocycleId: string): Promise<number[]>
    /** Remove the still-`planned` sessions of a mesocycle week (keeps completed ones),
     *  so a week can be safely regenerated. */
    abstract deletePlannedByMesocycleWeek(mesocycleId: string, week: number): Promise<void>
}
