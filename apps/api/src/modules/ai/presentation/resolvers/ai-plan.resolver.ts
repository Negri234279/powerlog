import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Throttle } from '@nestjs/throttler'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { AcceptPlanDraftCommand } from '../../application/commands/accept-plan-draft/accept-plan-draft.command'
import { DiscardPlanDraftCommand } from '../../application/commands/discard-plan-draft/discard-plan-draft.command'
import { GenerateSessionPlanDraftCommand } from '../../application/commands/generate-session-plan-draft/generate-session-plan-draft.command'
import { RefinePlanDraftCommand } from '../../application/commands/refine-plan-draft/refine-plan-draft.command'
import { GetSessionPlanDraftQuery } from '../../application/queries/get-session-plan-draft/get-session-plan-draft.query'
import type { AiPlanDraftView } from '../../application/views/ai-plan-draft.view'
import { RefinePlanDraftInput, refinePlanDraftSchema, uuidSchema } from '../inputs/refine-plan-draft.input'
import { AiPlanDraftType } from '../types/ai-plan-draft.type'

/**
 * AI-programmed sessions. Generating and refining each cost a call to the user's
 * own provider — and a slow one — so both are throttled well below the default.
 */
@Resolver(() => AiPlanDraftType)
@UseGuards(JwtCookieGuard)
export class AiPlanResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => AiPlanDraftType, {
        nullable: true,
        description: 'The proposal awaiting a decision on this session, if any.',
    })
    async sessionPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('sessionId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) sessionId: string,
    ): Promise<AiPlanDraftType | null> {
        const query = new GetSessionPlanDraftQuery(user.userId, sessionId)
        const view = await this.queryBus.execute<GetSessionPlanDraftQuery, AiPlanDraftView | null>(query)

        return view ? toType(view) : null
    }

    @Mutation(() => AiPlanDraftType, {
        description: 'Ask the default AI provider to program a planned session. Supersedes any open draft.',
    })
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async generateSessionPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('sessionId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) sessionId: string,
    ): Promise<AiPlanDraftType> {
        const command = new GenerateSessionPlanDraftCommand(user.userId, sessionId)

        return toType(await this.commandBus.execute<GenerateSessionPlanDraftCommand, AiPlanDraftView>(command))
    }

    @Mutation(() => AiPlanDraftType, { description: 'Ask the model to revise an open draft.' })
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    async refinePlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(refinePlanDraftSchema)) input: RefinePlanDraftInput,
    ): Promise<AiPlanDraftType> {
        const command = new RefinePlanDraftCommand(user.userId, input.draftId, input.message)

        return toType(await this.commandBus.execute<RefinePlanDraftCommand, AiPlanDraftView>(command))
    }

    @Mutation(() => AiPlanDraftType, { description: 'Write the draft’s targets onto its session.' })
    async acceptPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<AiPlanDraftType> {
        const command = new AcceptPlanDraftCommand(user.userId, draftId)

        return toType(await this.commandBus.execute<AcceptPlanDraftCommand, AiPlanDraftView>(command))
    }

    @Mutation(() => Boolean, { description: 'Throw away a draft without touching the session.' })
    async discardPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<boolean> {
        const command = new DiscardPlanDraftCommand(user.userId, draftId)

        return this.commandBus.execute<DiscardPlanDraftCommand, boolean>(command)
    }
}

const toType = (view: AiPlanDraftView): AiPlanDraftType => Object.assign(new AiPlanDraftType(), view)
