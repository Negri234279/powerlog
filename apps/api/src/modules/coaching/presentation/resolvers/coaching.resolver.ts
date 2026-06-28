import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { Roles } from '../../../../auth/roles.decorator'
import { RolesGuard } from '../../../../auth/roles.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { AcceptInvitationCommand } from '../../application/commands/accept-invitation/accept-invitation.command'
import { CancelInvitationCommand } from '../../application/commands/cancel-invitation/cancel-invitation.command'
import { DeclineInvitationCommand } from '../../application/commands/decline-invitation/decline-invitation.command'
import { InviteAthleteCommand } from '../../application/commands/invite-athlete/invite-athlete.command'
import { MyAthletesQuery } from '../../application/queries/my-athletes/my-athletes.query'
import { MyCoachesQuery } from '../../application/queries/my-coaches/my-coaches.query'
import { PendingInvitationsQuery } from '../../application/queries/pending-invitations/pending-invitations.query'
import type { CoachUserView, InvitationView, PendingInvitationView } from '../../application/views'
import { CoachInvitationType, CoachUserType, PendingInvitationType } from '../types/coaching.types'

const usernameArg = z.string().trim().min(3).max(30)
const uuidArg = z.string().uuid()

@Resolver(() => CoachInvitationType)
@UseGuards(JwtCookieGuard)
export class CoachingResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Mutation(() => CoachInvitationType, { description: 'Invite an athlete by username (coaches only).' })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async inviteAthlete(
        @CurrentUser() user: AuthUser,
        @Args('username', new ZodValidationPipe(usernameArg)) username: string,
    ): Promise<InvitationView> {
        return this.commandBus.execute(new InviteAthleteCommand(user.userId, username))
    }

    @Mutation(() => CoachInvitationType, { description: 'Accept a pending invitation (links you to the coach).' })
    async acceptInvitation(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<InvitationView> {
        return this.commandBus.execute(new AcceptInvitationCommand(user.userId, id))
    }

    @Mutation(() => CoachInvitationType, { description: 'Decline a pending invitation.' })
    async declineInvitation(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<InvitationView> {
        return this.commandBus.execute(new DeclineInvitationCommand(user.userId, id))
    }

    @Mutation(() => CoachInvitationType, { description: 'Cancel an invitation you sent (coaches only).' })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async cancelInvitation(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<InvitationView> {
        return this.commandBus.execute(new CancelInvitationCommand(user.userId, id))
    }

    @Query(() => [CoachUserType], { description: 'Coaches linked to the caller.' })
    async myCoaches(@CurrentUser() user: AuthUser): Promise<CoachUserView[]> {
        return this.queryBus.execute(new MyCoachesQuery(user.userId))
    }

    @Query(() => [CoachUserType], { description: 'Athletes linked to the caller.' })
    async myAthletes(@CurrentUser() user: AuthUser): Promise<CoachUserView[]> {
        return this.queryBus.execute(new MyAthletesQuery(user.userId))
    }

    @Query(() => [PendingInvitationType], { description: 'Pending invitations received by the caller.' })
    async pendingInvitations(@CurrentUser() user: AuthUser): Promise<PendingInvitationView[]> {
        return this.queryBus.execute(new PendingInvitationsQuery(user.userId))
    }
}
