import type { WorkoutSessionAggregate } from '../domain/entities/workout-session.entity'
import { WorkoutSessionNotFoundError } from '../domain/errors/workouts.errors'
import type { WorkoutSessionRepository } from '../domain/repositories/workout-session.repository'

/**
 * Loads a session the caller may manage: its owner (athlete) or the coach who
 * planned it (`plannedByUserId`). Anything else — missing or someone else's —
 * surfaces as "not found" (no existence leak). Self-created sessions have a null
 * planner, so only the owner matches.
 */
export async function requireManageableSession(
    sessions: WorkoutSessionRepository,
    sessionId: string,
    userId: string,
): Promise<WorkoutSessionAggregate> {
    const session = await sessions.findById(sessionId)
    if (!session || (session.userId !== userId && session.plannedByUserId !== userId)) {
        throw new WorkoutSessionNotFoundError()
    }

    return session
}
