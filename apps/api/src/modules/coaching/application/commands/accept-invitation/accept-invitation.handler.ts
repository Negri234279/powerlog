import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

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
        private readonly clock: Clock,
    ) {}

    async execute(command: AcceptInvitationCommand): Promise<InvitationView> {
        const invitation = await this.invitations.findById(command.invitationId)
        // Only the invited athlete can accept; hide others behind "not found".
        if (!invitation || invitation.athleteId !== command.athleteId) {
            throw new InvitationNotFoundError()
        }

        const now = this.clock.now()
        invitation.accept(now)
        await this.invitations.save(invitation)
        await this.links.link(invitation.coachId, invitation.athleteId, now)

        return toInvitationView(invitation)
    }
}
