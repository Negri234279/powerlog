import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { Clock } from '../../ports/clock.port'
import { CoachingMetrics } from '../../ports/coaching-metrics.port'
import { type InvitationView, toInvitationView } from '../../views'
import { CancelInvitationCommand } from './cancel-invitation.command'

@CommandHandler(CancelInvitationCommand)
export class CancelInvitationHandler implements ICommandHandler<CancelInvitationCommand, InvitationView> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly clock: Clock,
        private readonly metrics: CoachingMetrics,
    ) {}

    async execute(command: CancelInvitationCommand): Promise<InvitationView> {
        const invitation = await this.invitations.findById(command.invitationId)
        // Only the issuing coach can cancel; hide others behind "not found".
        if (!invitation || invitation.coachId !== command.coachId) {
            throw new InvitationNotFoundError()
        }

        invitation.cancel(this.clock.now())
        await this.invitations.save(invitation)
        // A coach can pull back an invite to an address with no account yet, so the
        // invitee dimension is whatever the invitation was addressed to.
        this.metrics.recordInvitation('cancelled', invitation.athleteId ? 'existing' : 'new')

        return toInvitationView(invitation)
    }
}
