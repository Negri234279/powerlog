import { QueryBus } from '@nestjs/cqrs'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { GetCoachInvitationPreviewQuery } from '../../application/queries/get-coach-invitation-preview/get-coach-invitation-preview.query'
import type { CoachInvitationPreview } from '../../application/views'
import { CoachInvitationPreviewType } from '../types/coaching.types'

const tokenArg = z.string().min(1).max(512)

/**
 * PUBLIC resolver (no auth guard): lets the signup page read a pending invitation
 * from its opaque token to prefill the email + suggest a handle. Returns null for
 * unknown/expired/answered tokens, so it never leaks whether a token existed.
 */
@Resolver(() => CoachInvitationPreviewType)
export class CoachInvitationPreviewResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => CoachInvitationPreviewType, {
        nullable: true,
        description: 'Public: preview a pending invitation by its opaque token (for the invite-aware signup page).',
    })
    async coachInvitationPreview(
        @Args('token', new ZodValidationPipe(tokenArg)) token: string,
    ): Promise<CoachInvitationPreview | null> {
        const query = new GetCoachInvitationPreviewQuery(token)
        return this.queryBus.execute(query)
    }
}
