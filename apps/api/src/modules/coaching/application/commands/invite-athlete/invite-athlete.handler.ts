import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../../shared/integration-events/coach-invitation-created.integration-event'
import { CoachInvitationEntity } from '../../../domain/entities/coach-invitation.entity'
import {
    AlreadyLinkedError,
    AthleteNotFoundError,
    CannotInviteSelfError,
    InvitationAlreadyPendingError,
} from '../../../domain/errors/coaching.errors'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { type InvitationView, toInvitationView } from '../../views'
import { InviteAthleteCommand } from './invite-athlete.command'

@CommandHandler(InviteAthleteCommand)
export class InviteAthleteHandler implements ICommandHandler<InviteAthleteCommand, InvitationView> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: InviteAthleteCommand): Promise<InvitationView> {
        const athleteId = await this.users.findUserIdByUsername(command.athleteUsername)
        if (!athleteId) {
            throw new AthleteNotFoundError()
        }
        if (athleteId === command.coachId) {
            throw new CannotInviteSelfError()
        }
        if (await this.links.areLinked(command.coachId, athleteId)) {
            throw new AlreadyLinkedError()
        }
        if (await this.invitations.findPending(command.coachId, athleteId)) {
            throw new InvitationAlreadyPendingError()
        }

        const invitation = CoachInvitationEntity.create({
            id: this.ids.uuid(),
            coachId: command.coachId,
            athleteId,
            now: this.clock.now(),
        })
        await this.invitations.save(invitation)

        // Lets the notifications module bell + email the athlete.
        const coach = await this.users.getContact(command.coachId)
        this.eventBus.publish(
            new CoachInvitationCreatedIntegrationEvent(
                invitation.id,
                command.coachId,
                athleteId,
                coach?.username ?? '',
            ),
        )

        return toInvitationView(invitation)
    }
}
