import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { materializeTemplateInto } from '../../materialize-template'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireOwnedTemplate } from '../../require-owned-template'
import { CreateSessionFromTemplateCommand } from './create-session-from-template.command'

@CommandHandler(CreateSessionFromTemplateCommand)
export class CreateSessionFromTemplateHandler implements ICommandHandler<
    CreateSessionFromTemplateCommand,
    WorkoutSessionView
> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly templates: WorkoutTemplateRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateSessionFromTemplateCommand): Promise<WorkoutSessionView> {
        const template = await requireOwnedTemplate(this.templates, command.templateId, command.userId)

        const now = this.clock.now()
        const session = WorkoutSessionAggregate.create({
            id: this.ids.uuid(),
            userId: command.userId,
            performedAt: command.performedAt ? new Date(command.performedAt) : now,
            notes: command.notes ?? null,
            now,
        })

        materializeTemplateInto(session, template, this.ids, now)

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
