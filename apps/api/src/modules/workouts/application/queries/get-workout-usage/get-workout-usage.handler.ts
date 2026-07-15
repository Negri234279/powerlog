import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { GetWorkoutUsageQuery } from './get-workout-usage.query'

/**
 * How many of each capped resource the user has created for themselves — the same
 * counts the create handlers check against the plan, surfaced so the web can show
 * "used / limit" beside the caps. Coach-programmed work is excluded, exactly as the
 * caps are.
 */
export interface WorkoutUsageView {
    templates: number
    mesocycles: number
    workouts: number
}

@QueryHandler(GetWorkoutUsageQuery)
export class GetWorkoutUsageHandler implements IQueryHandler<GetWorkoutUsageQuery, WorkoutUsageView> {
    constructor(
        private readonly templates: WorkoutTemplateRepository,
        private readonly mesocycles: MesocycleRepository,
        private readonly sessions: WorkoutSessionRepository,
    ) {}

    async execute(query: GetWorkoutUsageQuery): Promise<WorkoutUsageView> {
        const [templates, mesocycles, workouts] = await Promise.all([
            this.templates.countByOwner(query.userId),
            this.mesocycles.countSelfCreatedBy(query.userId),
            this.sessions.countSelfCreatedBy(query.userId),
        ])

        return { templates, mesocycles, workouts }
    }
}
