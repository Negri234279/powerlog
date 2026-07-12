import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { Clock } from '../../ports/clock.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireManageableSession } from '../../require-manageable-session'
import { RemoveSetCommand } from './remove-set.command'

@CommandHandler(RemoveSetCommand)
export class RemoveSetHandler implements ICommandHandler<RemoveSetCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
        private readonly clock: Clock,
    ) {}

    async execute(command: RemoveSetCommand): Promise<WorkoutSessionView> {
        const session = await requireManageableSession(
            this.sessions,
            this.coachLinks,
            command.sessionId,
            command.userId,
        )
        session.removeSet(command.entryId, command.setId, this.clock.now())

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
