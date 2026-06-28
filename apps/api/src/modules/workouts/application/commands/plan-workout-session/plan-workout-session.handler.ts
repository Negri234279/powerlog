import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { PlanWorkoutSessionCommand } from './plan-workout-session.command'

@CommandHandler(PlanWorkoutSessionCommand)
export class PlanWorkoutSessionHandler implements ICommandHandler<PlanWorkoutSessionCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: PlanWorkoutSessionCommand): Promise<WorkoutSessionView> {
        if (!(await this.coachLinks.areLinked(command.coachId, command.athleteId))) {
            throw new NotLinkedToAthleteError()
        }

        const now = this.clock.now()
        const session = WorkoutSessionAggregate.create({
            id: this.ids.uuid(),
            // Owned by the athlete; stamped with the planning coach.
            userId: command.athleteId,
            plannedByUserId: command.coachId,
            status: 'planned',
            performedAt: command.performedAt ? new Date(command.performedAt) : now,
            notes: command.notes ?? null,
            now,
        })

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
