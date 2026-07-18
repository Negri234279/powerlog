import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { WorkoutSessionPlannedIntegrationEvent } from '../../../../../shared/integration-events/workout-session-planned.integration-event'
import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
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
import { PlanSessionFromTemplateCommand } from './plan-session-from-template.command'

@CommandHandler(PlanSessionFromTemplateCommand)
export class PlanSessionFromTemplateHandler implements ICommandHandler<
    PlanSessionFromTemplateCommand,
    WorkoutSessionView
> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly templates: WorkoutTemplateRepository,
        private readonly coachLinks: CoachLinks,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: PlanSessionFromTemplateCommand): Promise<WorkoutSessionView> {
        if (!(await this.coachLinks.areLinked(command.coachId, command.athleteId))) {
            throw new NotLinkedToAthleteError()
        }

        // Programming for someone else is the coach's plan paying, not the
        // athlete's: it's the coach who performs the action.
        await this.entitlements.assertFeature(command.coachId, 'coach', 'plan_sessions')

        // The coach plans from their own template (ownership scoped to the coach).
        const template = await requireOwnedTemplate(this.templates, command.templateId, command.coachId)

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

        materializeTemplateInto(session, template, this.ids, now)

        await this.sessions.save(session)

        this.eventBus.publish(
            new WorkoutSessionPlannedIntegrationEvent(
                command.coachId,
                command.athleteId,
                session.id,
                session.performedAt,
            ),
        )

        return toWorkoutSessionView(session)
    }
}
