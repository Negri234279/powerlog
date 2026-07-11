import { EventBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { CoachLinkEstablishedIntegrationEvent } from '../../../../shared/integration-events/coach-link-established.integration-event'
import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import { CoachInvitationRepository } from '../../domain/repositories/coach-invitation.repository'
import { CoachLinkRepository } from '../../domain/repositories/coach-link.repository'
import { Clock } from '../ports/clock.port'

/**
 * Auto-links a brand-new user to any coach who invited that email before they had
 * an account: binds the invitation to the new user id, accepts it, creates the
 * coach↔athlete link, and publishes {@link CoachLinkEstablishedIntegrationEvent}
 * so both parties get notified. Invitations that already targeted a registered
 * user are left untouched — those still require an explicit accept.
 */
@EventsHandler(UserRegisteredIntegrationEvent)
export class LinkInvitationsOnUserRegistered implements IEventHandler<UserRegisteredIntegrationEvent> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
        private readonly clock: Clock,
        private readonly eventBus: EventBus,
    ) {}

    async handle(event: UserRegisteredIntegrationEvent): Promise<void> {
        const email = event.email.trim().toLowerCase()
        const pending = await this.invitations.listPendingByEmail(email)
        if (pending.length === 0) return

        const now = this.clock.now()
        const athlete = await this.users.getContact(event.userId)

        for (const invitation of pending) {
            // Only auto-link email-only invites; existing-user ones need an accept.
            if (invitation.athleteId !== null) continue
            if (await this.links.areLinked(invitation.coachId, event.userId)) continue

            invitation.linkAthlete(event.userId, now)
            invitation.accept(now)
            await this.invitations.save(invitation)
            await this.links.link(invitation.coachId, event.userId, now)

            const coach = await this.users.getContact(invitation.coachId)
            this.eventBus.publish(
                new CoachLinkEstablishedIntegrationEvent(
                    invitation.coachId,
                    event.userId,
                    coach?.username ?? '',
                    athlete?.username ?? '',
                ),
            )
        }
    }
}
