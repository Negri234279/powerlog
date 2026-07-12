import { type IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs'

import { FindUserIdByHandleQuery } from '../../../../../shared/contracts/find-user-id-by-handle.query'
import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { InviteTokenGenerator } from '../../ports/invite-token-generator.port'
import type { CoachInvitationPreview } from '../../views'
import { GetCoachInvitationPreviewQuery } from './get-coach-invitation-preview.query'

@QueryHandler(GetCoachInvitationPreviewQuery)
export class GetCoachInvitationPreviewHandler implements IQueryHandler<
    GetCoachInvitationPreviewQuery,
    CoachInvitationPreview | null
> {
    constructor(
        private readonly invitations: CoachInvitationRepository,
        private readonly users: UserDirectory,
        private readonly tokens: InviteTokenGenerator,
        private readonly queryBus: QueryBus,
    ) {}

    async execute(query: GetCoachInvitationPreviewQuery): Promise<CoachInvitationPreview | null> {
        const invitation = await this.invitations.findPendingByTokenHash(this.tokens.hash(query.token))
        if (!invitation) return null

        const coach = await this.users.getContact(invitation.coachId)

        return {
            email: invitation.email,
            coachUsername: coach?.username ?? '',
            suggestedUsername: await this.suggestUsername(invitation.email),
        }
    }

    /** A valid, currently-available handle derived from the email local-part. */
    private async suggestUsername(email: string): Promise<string> {
        const local = email.split('@')[0] ?? ''
        const cleaned = local.toLowerCase().replace(/[^a-z0-9_]/g, '')
        const base = (cleaned.length >= 3 ? cleaned : `${cleaned}athlete`).slice(0, 24)

        if (await this.isAvailable(base)) return base

        for (let i = 2; i <= 99; i++) {
            const candidate = `${base}${i}`
            if (await this.isAvailable(candidate)) return candidate
        }

        return `${base}${Date.now().toString().slice(-4)}`
    }

    private async isAvailable(handle: string): Promise<boolean> {
        const userId = await this.queryBus.execute<FindUserIdByHandleQuery, string | null>(
            new FindUserIdByHandleQuery(handle),
        )
        return userId === null
    }
}
