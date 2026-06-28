import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { Clock } from '../../ports/clock.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireManageableSession } from '../../require-manageable-session'
import { CompleteWorkoutSessionCommand } from './complete-workout-session.command'

@CommandHandler(CompleteWorkoutSessionCommand)
export class CompleteWorkoutSessionHandler implements ICommandHandler<
    CompleteWorkoutSessionCommand,
    WorkoutSessionView
> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: CompleteWorkoutSessionCommand): Promise<WorkoutSessionView> {
        const session = await requireManageableSession(this.sessions, command.sessionId, command.userId)
        session.complete(this.clock.now())

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
