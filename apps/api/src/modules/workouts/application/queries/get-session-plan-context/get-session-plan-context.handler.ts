import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetSessionPlanContextQuery } from '../../../../../shared/contracts/get-session-plan-context.query'
import type {
    ExerciseHistoryContext,
    ExercisePlanContext,
    SessionPlanContext,
} from '../../../../../shared/contracts/session-plan-context'
import type { ExerciseEntryEntity } from '../../../domain/entities/exercise-entry.entity'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { ExerciseSessionHistoryReadModel } from '../../ports/exercise-session-history.read-model'

/**
 * Assembles what the AI module needs to program a planned session. Workouts owns
 * this data, so it builds the snapshot itself; the AI module never reaches into
 * the schema.
 *
 * Returns null — rather than throwing — when the session is missing, belongs to
 * someone else, or is no longer `planned`. From the caller's side those are the
 * same thing: there is nothing here to program, and a "not found" that doesn't
 * distinguish the three leaks nothing about other users' sessions.
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
    ) {}

    async execute(query: GetSessionPlanContextQuery): Promise<SessionPlanContext | null> {
        const session = await this.sessions.findById(query.sessionId)
        if (!session || session.userId !== query.userId || session.status !== 'planned') return null

        const exercises: ExercisePlanContext[] = []
        for (const entry of session.entries) {
            exercises.push(await this.contextFor(entry, query))
        }

        return {
            sessionId: session.id,
            performedAt: session.performedAt,
            sessionNotes: session.notes,
            exercises,
        }
    }

    private async contextFor(
        entry: ExerciseEntryEntity,
        query: GetSessionPlanContextQuery,
    ): Promise<ExercisePlanContext> {
        const exercise = await this.exercises.findById(entry.exerciseId)

        const rows = await this.history.forExercise({
            userId: query.userId,
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
                plannedWeightKg: set.plannedWeight?.value ?? null,
                plannedReps: set.plannedReps?.value ?? null,
                rpe: set.rpe?.value ?? null,
                rir: set.rir?.value ?? null,
                notes: set.notes,
            })),
            history,
        }
    }
}
