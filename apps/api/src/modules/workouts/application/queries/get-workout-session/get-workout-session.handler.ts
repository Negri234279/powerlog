import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import type { WorkoutStatus } from '../../../domain/workout-status'
import { requireManageableSession } from '../../require-manageable-session'
import { GetWorkoutSessionQuery } from './get-workout-session.query'

/** Read models (decoupled from the aggregate). Weights are kg. */
export interface WorkoutSetView {
    id: string
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    weightKg: number | null
    reps: number | null
    rpe: number | null
    rir: number | null
    e1rmKg: number | null
    notes: string | null
}

export interface ExerciseEntryView {
    id: string
    exerciseId: string
    order: number
    notes: string | null
    sets: WorkoutSetView[]
}

export interface WorkoutSessionView {
    id: string
    userId: string
    status: WorkoutStatus
    performedAt: Date
    notes: string | null
    plannedByUserId: string | null
    createdAt: Date
    updatedAt: Date
    entries: ExerciseEntryView[]
}

export function toWorkoutSessionView(session: WorkoutSessionAggregate): WorkoutSessionView {
    return {
        id: session.id,
        userId: session.userId,
        status: session.status,
        performedAt: session.performedAt,
        notes: session.notes,
        plannedByUserId: session.plannedByUserId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        entries: session.entries.map((entry) => ({
            id: entry.id,
            exerciseId: entry.exerciseId,
            order: entry.order,
            notes: entry.notes,
            sets: entry.sets.map((set) => ({
                id: set.id,
                order: set.order,
                plannedWeightKg: set.plannedWeight?.value ?? null,
                plannedReps: set.plannedReps?.value ?? null,
                weightKg: set.weight?.value ?? null,
                reps: set.reps?.value ?? null,
                rpe: set.rpe?.value ?? null,
                rir: set.rir?.value ?? null,
                e1rmKg: set.e1rmKg,
                notes: set.notes,
            })),
        })),
    }
}

@QueryHandler(GetWorkoutSessionQuery)
export class GetWorkoutSessionHandler implements IQueryHandler<GetWorkoutSessionQuery, WorkoutSessionView> {
    constructor(private readonly sessions: WorkoutSessionRepository) {}

    async execute(query: GetWorkoutSessionQuery): Promise<WorkoutSessionView> {
        const session = await requireManageableSession(this.sessions, query.sessionId, query.userId)
        return toWorkoutSessionView(session)
    }
}
