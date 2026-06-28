import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { CreateWorkoutSessionCommand } from './create-workout-session.command'

@CommandHandler(CreateWorkoutSessionCommand)
export class CreateWorkoutSessionHandler implements ICommandHandler<CreateWorkoutSessionCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateWorkoutSessionCommand): Promise<WorkoutSessionView> {
        const now = this.clock.now()
        const session = WorkoutSessionAggregate.create({
            id: this.ids.uuid(),
            userId: command.userId,
            performedAt: command.performedAt ? new Date(command.performedAt) : now,
            notes: command.notes ?? null,
            now,
        })

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
