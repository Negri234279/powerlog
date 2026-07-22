import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetSessionPlanContextQuery } from '../../../../../shared/contracts/get-session-plan-context.query'
import type {
    ExerciseHistoryContext,
    ExercisePlanContext,
    SessionPlanContext,
} from '../../../../../shared/contracts/session-plan-context'
import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import type { ExerciseEntryEntity } from '../../../domain/entities/exercise-entry.entity'
import type { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { ExerciseSessionHistoryReadModel } from '../../ports/exercise-session-history.read-model'
import { requireManageableSession } from '../../require-manageable-session'

/**
 * Assembles what the AI module needs to program a planned session. Workouts owns
 * this data, so it builds the snapshot itself; the AI module never reaches into
 * the schema.
 *
 * Who may ask is `requireManageableSession`'s call — the athlete, or the coach who
 * planned the session and still coaches them — the same rule every write on a
 * session already uses. Whose *numbers* go in is a different question: the history
 * is always the session OWNER's, because that is who will lift it. A coach asking
 * the model to program for an athlete off the coach's own marks would be worse
 * than useless.
 *
 * Returns null — rather than throwing — when the session is missing, isn't the
 * caller's to manage, or is no longer `planned`. From the caller's side those are
 * the same thing: there is nothing here to program, and a "not found" that doesn't
 * distinguish them leaks nothing about other users' sessions.
 */
@QueryHandler(GetSessionPlanContextQuery)
export class GetSessionPlanContextHandler implements IQueryHandler<
    GetSessionPlanContextQuery,
    SessionPlanContext | null
> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly exercises: ExerciseRepository,
        private readonly history: ExerciseSessionHistoryReadModel,
        private readonly coachLinks: CoachLinks,
    ) {}

    async execute(query: GetSessionPlanContextQuery): Promise<SessionPlanContext | null> {
        const session = await this.manageableSession(query)
        if (!session || session.status !== 'planned') return null

        // Narrowing to one entry keeps the history lookups to the exercise that
        // was actually asked about.
        const entries = query.entryId ? session.entries.filter((entry) => entry.id === query.entryId) : session.entries

        const exercises: ExercisePlanContext[] = []
        for (const entry of entries) {
            exercises.push(await this.contextFor(entry, session.userId, query))
        }

        return {
            sessionId: session.id,
            ownerId: session.userId,
            performedAt: session.performedAt,
            sessionNotes: session.notes,
            exercises,
        }
    }

    /** The shared rule, adapted to this query's null contract. */
    private async manageableSession(query: GetSessionPlanContextQuery): Promise<WorkoutSessionAggregate | null> {
        try {
            return await requireManageableSession(this.sessions, this.coachLinks, query.sessionId, query.userId)
        } catch {
            return null
        }
    }

    private async contextFor(
        entry: ExerciseEntryEntity,
        ownerId: string,
        query: GetSessionPlanContextQuery,
    ): Promise<ExercisePlanContext> {
        const exercise = await this.exercises.findById(entry.exerciseId)

        const rows = await this.history.forExercise({
            // The owner's history, not the caller's — see the class comment.
            userId: ownerId,
            exerciseId: entry.exerciseId,
            // The session being programmed has nothing logged yet, but excluding it
            // keeps the history strictly "what happened before".
            excludeSessionId: query.sessionId,
            limit: query.historyLimit,
        })

        const history: ExerciseHistoryContext[] = rows.map((row) => ({
            performedAt: row.performedAt,
            sessionNotes: row.sessionNotes,
            exerciseNotes: row.exerciseNotes,
            sets: row.sets.map((set) => ({
                weightKg: set.weightKg,
                reps: set.reps,
                rpe: set.rpe,
                rir: set.rir,
                e1rmKg: set.e1rmKg,
                notes: set.notes,
            })),
        }))

        return {
            exerciseId: entry.exerciseId,
            entryId: entry.id,
            // A deleted exercise leaves its id behind; naming it "unknown" is more
            // useful to the model than dropping the entry it must still program.
            name: exercise?.name ?? 'Unknown exercise',
            entryNotes: entry.notes,
            sets: entry.sets.map((set) => ({
                setId: set.id,
                order: set.order,
                // The floor of each planned range — the model is given one number
                // per target, as it always was. See `PlannedSetContext`.
                plannedWeightKg: set.plannedWeight?.min.value ?? null,
                plannedReps: set.plannedReps?.min.value ?? null,
                rpe: set.rpe?.value ?? null,
                rir: set.rir?.value ?? null,
                notes: set.notes,
            })),
            history,
        }
    }
}
