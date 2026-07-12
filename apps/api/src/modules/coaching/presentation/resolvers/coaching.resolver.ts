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
import { LeaveCoachCommand } from '../../application/commands/leave-coach/leave-coach.command'
import { RemoveAthleteCommand } from '../../application/commands/remove-athlete/remove-athlete.command'
import { SetAthleteNoteCommand } from '../../application/commands/set-athlete-note/set-athlete-note.command'
import { GetAthleteNoteQuery } from '../../application/queries/get-athlete-note/get-athlete-note.query'
import { MyAthletesQuery } from '../../application/queries/my-athletes/my-athletes.query'
import { MyCoachesQuery } from '../../application/queries/my-coaches/my-coaches.query'
import { PendingInvitationsQuery } from '../../application/queries/pending-invitations/pending-invitations.query'
import type { CoachNoteView } from '../../domain/repositories/coach-note.repository'
import type { CoachUserView, InvitationView, PendingInvitationView } from '../../application/views'
import {
    CoachAthleteNoteType,
    CoachInvitationType,
    CoachUserType,
    PendingInvitationType,
} from '../types/coaching.types'

const emailArg = z.string().trim().email()
const uuidArg = z.string().uuid()
const noteBodyArg = z.string().max(5000)

@Resolver(() => CoachInvitationType)
@UseGuards(JwtCookieGuard)
export class CoachingResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Mutation(() => CoachInvitationType, {
        description: 'Invite an athlete by email (coaches only). Works whether or not they have an account yet.',
    })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async inviteAthlete(
        @CurrentUser() user: AuthUser,
        @Args('email', new ZodValidationPipe(emailArg)) email: string,
    ): Promise<InvitationView> {
        const command = new InviteAthleteCommand(user.userId, email)
        return this.commandBus.execute(command)
    }

    @Mutation(() => CoachInvitationType, { description: 'Accept a pending invitation (links you to the coach).' })
    async acceptInvitation(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<InvitationView> {
        const command = new AcceptInvitationCommand(user.userId, id)
        return this.commandBus.execute(command)
    }

    @Mutation(() => CoachInvitationType, { description: 'Decline a pending invitation.' })
    async declineInvitation(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<InvitationView> {
        const command = new DeclineInvitationCommand(user.userId, id)
        return this.commandBus.execute(command)
    }

    @Mutation(() => CoachInvitationType, { description: 'Cancel an invitation you sent (coaches only).' })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async cancelInvitation(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<InvitationView> {
        const command = new CancelInvitationCommand(user.userId, id)
        return this.commandBus.execute(command)
    }

    @Mutation(() => Boolean, {
        description:
            'Stop coaching an athlete (coaches only). They keep everything you planned for them; you lose access to it.',
    })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async removeAthlete(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
    ): Promise<boolean> {
        const command = new RemoveAthleteCommand(user.userId, athleteId)
        return this.commandBus.execute(command)
    }

    @Mutation(() => Boolean, {
        description: 'Leave one of your coaches. You keep everything they planned for you; they lose access to it.',
    })
    async leaveCoach(
        @CurrentUser() user: AuthUser,
        @Args('coachId', { type: () => ID }, new ZodValidationPipe(uuidArg)) coachId: string,
    ): Promise<boolean> {
        const command = new LeaveCoachCommand(user.userId, coachId)
        return this.commandBus.execute(command)
    }

    @Query(() => [CoachUserType], { description: 'Coaches linked to the caller.' })
    async myCoaches(@CurrentUser() user: AuthUser): Promise<CoachUserView[]> {
        const query = new MyCoachesQuery(user.userId)
        return this.queryBus.execute(query)
    }

    @Query(() => [CoachUserType], { description: 'Athletes linked to the caller.' })
    async myAthletes(@CurrentUser() user: AuthUser): Promise<CoachUserView[]> {
        const query = new MyAthletesQuery(user.userId)
        return this.queryBus.execute(query)
    }

    @Query(() => [PendingInvitationType], { description: 'Pending invitations received by the caller.' })
    async pendingInvitations(@CurrentUser() user: AuthUser): Promise<PendingInvitationView[]> {
        const query = new PendingInvitationsQuery(user.userId)
        return this.queryBus.execute(query)
    }

    @Query(() => CoachAthleteNoteType, {
        nullable: true,
        description: 'Your private note on one of your athletes (coaches only).',
    })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async athleteNote(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
    ): Promise<CoachNoteView | null> {
        const query = new GetAthleteNoteQuery(user.userId, athleteId)
        return this.queryBus.execute(query)
    }

    @Mutation(() => Boolean, {
        description: 'Set (or clear, when the body is empty) your private note on an athlete (coaches only).',
    })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async setAthleteNote(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID }, new ZodValidationPipe(uuidArg)) athleteId: string,
        @Args('body', new ZodValidationPipe(noteBodyArg)) body: string,
    ): Promise<boolean> {
        const command = new SetAthleteNoteCommand(user.userId, athleteId, body)
        await this.commandBus.execute(command)
        return true
    }
}
