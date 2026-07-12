import type { CoachLinks } from '../../../shared/contracts/coach-links'
import type { WorkoutSessionAggregate } from '../domain/entities/workout-session.entity'
import { WorkoutSessionNotFoundError } from '../domain/errors/workouts.errors'
import type { WorkoutSessionRepository } from '../domain/repositories/workout-session.repository'

/**
 * Loads a session the caller may manage: its owner (the athlete) always, plus
 * the coach who planned it (`plannedByUserId`) for as long as they still coach
 * the owner. When the relationship ends, the athlete keeps the session and the
 * ex-coach can no longer read or touch it.
 *
 * Anything else — missing or someone else's — surfaces as "not found" (no
 * existence leak). Self-created sessions have a null planner, so only the owner
 * matches.
 */
export async function requireManageableSession(
    sessions: WorkoutSessionRepository,
    coachLinks: CoachLinks,
    sessionId: string,
    userId: string,
): Promise<WorkoutSessionAggregate> {
    const session = await sessions.findById(sessionId)
    if (!session) throw new WorkoutSessionNotFoundError()

    if (session.userId === userId) return session

    const isPlanner = session.plannedByUserId === userId
    if (isPlanner && (await coachLinks.areLinked(userId, session.userId))) return session

    throw new WorkoutSessionNotFoundError()
}
