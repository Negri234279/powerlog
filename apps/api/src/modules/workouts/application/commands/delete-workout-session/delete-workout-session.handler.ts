import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { requireManageableSession } from '../../require-manageable-session'
import { DeleteWorkoutSessionCommand } from './delete-workout-session.command'

@CommandHandler(DeleteWorkoutSessionCommand)
export class DeleteWorkoutSessionHandler implements ICommandHandler<DeleteWorkoutSessionCommand, boolean> {
    constructor(private readonly sessions: WorkoutSessionRepository) {}

    async execute(command: DeleteWorkoutSessionCommand): Promise<boolean> {
        // Asserts ownership before deleting (cascade removes entries + sets).
        await requireManageableSession(this.sessions, command.sessionId, command.userId)

        await this.sessions.delete(command.sessionId)

        return true
    }
}
