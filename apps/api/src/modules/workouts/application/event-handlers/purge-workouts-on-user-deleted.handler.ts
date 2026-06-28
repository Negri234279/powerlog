import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { WorkoutSessionRepository } from '../../domain/repositories/workout-session.repository'
import { WorkoutTemplateRepository } from '../../domain/repositories/workout-template.repository'

/**
 * Erases a user's workout data when they delete their account (GDPR). `userId`
 * is a soft reference (no FK to auth), so nothing cascades automatically — this
 * removes the sessions and templates the user owns (their entries/sets cascade
 * via the in-module FKs). Sessions a coach planned for an athlete are owned by
 * the athlete, so a coach leaving doesn't wipe their athletes' work. Idempotent.
 */
@EventsHandler(UserDeletedIntegrationEvent)
export class PurgeWorkoutsOnUserDeleted implements IEventHandler<UserDeletedIntegrationEvent> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly templates: WorkoutTemplateRepository,
    ) {}

    async handle(event: UserDeletedIntegrationEvent): Promise<void> {
        await this.sessions.deleteAllByUser(event.userId)
        await this.templates.deleteAllByOwner(event.userId)
    }
}
