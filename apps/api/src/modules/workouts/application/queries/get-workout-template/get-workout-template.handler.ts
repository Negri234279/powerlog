import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { WorkoutTemplateAggregate } from '../../../domain/entities/workout-template.entity'
import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { type RangeView, toRangeView } from '../../range-view'
import { requireOwnedTemplate } from '../../require-owned-template'
import { GetWorkoutTemplateQuery } from './get-workout-template.query'

/** Read models (decoupled from the aggregate). Weights are kg; targets are ranges. */
export interface TemplateSetView {
    id: string
    order: number
    plannedWeightKg: RangeView | null
    plannedReps: RangeView | null
    rpe: RangeView | null
    rir: RangeView | null
    notes: string | null
}

export interface TemplateExerciseView {
    id: string
    exerciseId: string
    order: number
    notes: string | null
    sets: TemplateSetView[]
}

export interface WorkoutTemplateView {
    id: string
    ownerId: string
    name: string
    notes: string | null
    createdAt: Date
    updatedAt: Date
    exercises: TemplateExerciseView[]
}

export function toWorkoutTemplateView(template: WorkoutTemplateAggregate): WorkoutTemplateView {
    return {
        id: template.id,
        ownerId: template.ownerId,
        name: template.name.value,
        notes: template.notes,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        exercises: template.exercises.map((exercise) => ({
            id: exercise.id,
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            notes: exercise.notes,
            sets: exercise.sets.map((set) => ({
                id: set.id,
                order: set.order,
                plannedWeightKg: toRangeView(set.plannedWeight),
                plannedReps: toRangeView(set.plannedReps),
                rpe: toRangeView(set.rpe),
                rir: toRangeView(set.rir),
                notes: set.notes,
            })),
        })),
    }
}

@QueryHandler(GetWorkoutTemplateQuery)
export class GetWorkoutTemplateHandler implements IQueryHandler<GetWorkoutTemplateQuery, WorkoutTemplateView> {
    constructor(private readonly templates: WorkoutTemplateRepository) {}

    async execute(query: GetWorkoutTemplateQuery): Promise<WorkoutTemplateView> {
        const template = await requireOwnedTemplate(this.templates, query.templateId, query.ownerId)
        return toWorkoutTemplateView(template)
    }
}
