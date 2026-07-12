import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import type { MesocycleAggregate } from '../../../domain/entities/mesocycle.entity'
import type { MesocycleStatus } from '../../../domain/mesocycle-status'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { requireReadableMesocycle } from '../../require-manageable-mesocycle'
import { GetMesocycleQuery } from './get-mesocycle.query'

/** Read models (decoupled from the aggregate). Weights are kg. */
export interface MesocycleDaySetView {
    id: string
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    notes: string | null
}

export interface MesocycleDayExerciseView {
    id: string
    exerciseId: string
    order: number
    notes: string | null
    sets: MesocycleDaySetView[]
}

export interface MicrocycleDayView {
    id: string
    order: number
    dayOffset: number
    label: string | null
    notes: string | null
    exercises: MesocycleDayExerciseView[]
}

export interface MicrocycleView {
    id: string
    weekIndex: number
    label: string | null
    notes: string | null
    days: MicrocycleDayView[]
}

export interface MesocycleView {
    id: string
    ownerId: string
    /** Coach who plans this block for the owner (null = self-made). */
    plannedByUserId: string | null
    name: string
    notes: string | null
    goal: string | null
    startDate: Date | null
    status: MesocycleStatus
    createdAt: Date
    updatedAt: Date
    microcycles: MicrocycleView[]
    /** 1-based weeks already materialized into sessions (ascending). */
    generatedWeeks: number[]
}

export function toMesocycleView(mesocycle: MesocycleAggregate, generatedWeeks: number[]): MesocycleView {
    return {
        id: mesocycle.id,
        ownerId: mesocycle.ownerId,
        plannedByUserId: mesocycle.plannedByUserId,
        name: mesocycle.name.value,
        notes: mesocycle.notes,
        goal: mesocycle.goal,
        startDate: mesocycle.startDate,
        status: mesocycle.status,
        createdAt: mesocycle.createdAt,
        updatedAt: mesocycle.updatedAt,
        microcycles: mesocycle.microcycles.map((microcycle) => ({
            id: microcycle.id,
            weekIndex: microcycle.weekIndex,
            label: microcycle.label,
            notes: microcycle.notes,
            days: microcycle.days.map((day) => ({
                id: day.id,
                order: day.order,
                dayOffset: day.dayOffset,
                label: day.label,
                notes: day.notes,
                exercises: day.exercises.map((exercise) => ({
                    id: exercise.id,
                    exerciseId: exercise.exerciseId,
                    order: exercise.order,
                    notes: exercise.notes,
                    sets: exercise.sets.map((set) => ({
                        id: set.id,
                        order: set.order,
                        plannedWeightKg: set.plannedWeight?.value ?? null,
                        plannedReps: set.plannedReps?.value ?? null,
                        rpe: set.rpe?.value ?? null,
                        rir: set.rir?.value ?? null,
                        notes: set.notes,
                    })),
                })),
            })),
        })),
        generatedWeeks,
    }
}

@QueryHandler(GetMesocycleQuery)
export class GetMesocycleHandler implements IQueryHandler<GetMesocycleQuery, MesocycleView> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
    ) {}

    async execute(query: GetMesocycleQuery): Promise<MesocycleView> {
        const mesocycle = await requireReadableMesocycle(
            this.mesocycles,
            this.coachLinks,
            query.mesocycleId,
            query.ownerId,
        )
        const generatedWeeks = await this.sessions.generatedWeeks(mesocycle.id)
        return toMesocycleView(mesocycle, generatedWeeks)
    }
}
