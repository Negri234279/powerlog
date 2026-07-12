import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../../shared/integration-events/coach-invitation-created.integration-event'
import { CoachInvitationEntity } from '../../../domain/entities/coach-invitation.entity'
import {
    AlreadyLinkedError,
    CannotInviteSelfError,
    InvitationAlreadyPendingError,
} from '../../../domain/errors/coaching.errors'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { InviteTokenGenerator } from '../../ports/invite-token-generator.port'
import { type InvitationView, toInvitationView } from '../../views'
import { InviteAthleteCommand } from './invite-athlete.command'

@CommandHandler(InviteAthleteCommand)
export class InviteAthleteHandler implements ICommandHandler<InviteAthleteCommand, InvitationView> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly tokens: InviteTokenGenerator,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: InviteAthleteCommand): Promise<InvitationView> {
        const email = command.email.trim().toLowerCase()

        // The invitee may or may not have an account yet.
        const athleteId = await this.users.findUserIdByEmail(email)

        const coach = await this.users.getContact(command.coachId)
        // Guard self-invites both by id (registered) and by email (pre-registration).
        if (athleteId === command.coachId || (coach && coach.email.toLowerCase() === email)) {
            throw new CannotInviteSelfError()
        }
        if (athleteId && (await this.links.areLinked(command.coachId, athleteId))) {
            throw new AlreadyLinkedError()
        }
        if (await this.invitations.findPendingByEmail(command.coachId, email)) {
            throw new InvitationAlreadyPendingError()
        }

        // Plan limit on how many athletes a coach may take on (unlimited for now).
        const currentAthletes = await this.links.athleteIdsOf(command.coachId)
        await this.entitlements.assertCanAddAthlete(command.coachId, currentAthletes.length)

        // Opaque token for the signup link; only its hash is stored.
        const token = this.tokens.generate()
        const invitation = CoachInvitationEntity.create({
            id: this.ids.uuid(),
            coachId: command.coachId,
            email,
            athleteId,
            tokenHash: token.hash,
            now: this.clock.now(),
        })
        await this.invitations.save(invitation)

        // Lets the notifications module bell + email the athlete, or email-only a
        // signup invite (with the token link) when the address has no account yet.
        this.eventBus.publish(
            new CoachInvitationCreatedIntegrationEvent(
                invitation.id,
                command.coachId,
                athleteId,
                email,
                coach?.username ?? '',
                token.raw,
            ),
        )

        return toInvitationView(invitation)
    }
}
