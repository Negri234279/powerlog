import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { Clock } from '../../ports/clock.port'
import { type InvitationView, toInvitationView } from '../../views'
import { DeclineInvitationCommand } from './decline-invitation.command'

@CommandHandler(DeclineInvitationCommand)
export class DeclineInvitationHandler implements ICommandHandler<DeclineInvitationCommand, InvitationView> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: DeclineInvitationCommand): Promise<InvitationView> {
        const invitation = await this.invitations.findById(command.invitationId)
        if (!invitation || invitation.athleteId !== command.athleteId) {
            throw new InvitationNotFoundError()
        }

        invitation.decline(this.clock.now())
        await this.invitations.save(invitation)

        return toInvitationView(invitation)
    }
}
