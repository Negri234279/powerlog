import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachLinkEstablishedIntegrationEvent } from '../../../../../shared/integration-events/coach-link-established.integration-event'
import { InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import { Clock } from '../../ports/clock.port'
import { type InvitationView, toInvitationView } from '../../views'
import { AcceptInvitationCommand } from './accept-invitation.command'

@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand, InvitationView> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
        private readonly clock: Clock,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: AcceptInvitationCommand): Promise<InvitationView> {
        const invitation = await this.invitations.findById(command.invitationId)
        const athleteId = invitation?.athleteId
        // Only the invited athlete can accept; hide others behind "not found".
        if (!invitation || athleteId === null || athleteId !== command.athleteId) {
            throw new InvitationNotFoundError()
        }

        const now = this.clock.now()
        invitation.accept(now)
        await this.invitations.save(invitation)
        await this.links.link(invitation.coachId, athleteId, now)

        // Notify the coach (+ athlete) that they're now linked.
        const [coach, athlete] = await Promise.all([
            this.users.getContact(invitation.coachId),
            this.users.getContact(athleteId),
        ])
        this.eventBus.publish(
            new CoachLinkEstablishedIntegrationEvent(
                invitation.coachId,
                athleteId,
                coach?.username ?? '',
                athlete?.username ?? '',
            ),
        )

        return toInvitationView(invitation)
    }
}
