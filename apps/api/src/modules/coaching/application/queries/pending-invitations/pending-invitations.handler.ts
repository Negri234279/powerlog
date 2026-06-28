import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import type { PendingInvitationView } from '../../views'
import { PendingInvitationsQuery } from './pending-invitations.query'

@QueryHandler(PendingInvitationsQuery)
export class PendingInvitationsHandler implements IQueryHandler<PendingInvitationsQuery, PendingInvitationView[]> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: PendingInvitationsQuery): Promise<PendingInvitationView[]> {
        const pending = await this.invitations.listPendingForAthlete(query.athleteId)
        return Promise.all(
            pending.map(async (invitation) => {
                const coach = await this.users.getContact(invitation.coachId)
                return {
                    id: invitation.id,
                    coachId: invitation.coachId,
                    coachUsername: coach?.username ?? '',
                    createdAt: invitation.createdAt,
                }
            }),
        )
    }
}
