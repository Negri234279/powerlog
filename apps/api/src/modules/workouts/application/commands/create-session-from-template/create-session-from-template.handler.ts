import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
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
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateSessionFromTemplateCommand): Promise<WorkoutSessionView> {
        // Starting a session — from a template or not — creates a workout, so it's
        // the workout cap that gates it. Using an existing template stays allowed
        // after a downgrade; only creating new templates is what `maxTemplates` caps.
        const owned = await this.sessions.countSelfCreatedBy(command.userId)
        await this.entitlements.assertWithinLimit(command.userId, 'athlete', 'workouts', owned)

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
