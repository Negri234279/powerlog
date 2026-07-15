import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
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
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateWorkoutSessionCommand): Promise<WorkoutSessionView> {
        // Only creating is gated: an over-cap athlete keeps and edits what they have.
        const owned = await this.sessions.countSelfCreatedBy(command.userId)
        await this.entitlements.assertWithinLimit(command.userId, 'workouts', owned)

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
