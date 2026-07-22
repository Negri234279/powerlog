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
import { ForkPlanDraftCommand } from '../../application/commands/fork-plan-draft/fork-plan-draft.command'
import { QueueSessionPlanGenerationCommand } from '../../application/commands/queue-session-plan-generation/queue-session-plan-generation.command'
import { QueueSessionPlanRefinementCommand } from '../../application/commands/queue-session-plan-refinement/queue-session-plan-refinement.command'
import { GetSessionPlanDraftQuery } from '../../application/queries/get-session-plan-draft/get-session-plan-draft.query'
import type { AiGenerationView } from '../../application/views/ai-generation.view'
import type { AiPlanDraftView } from '../../application/views/ai-plan-draft.view'
import {
    GenerateSessionPlanDraftInput,
    generateSessionPlanDraftSchema,
} from '../inputs/generate-session-plan-draft.input'
import { RefinePlanDraftInput, refinePlanDraftSchema } from '../inputs/refine-plan-draft.input'
import { uuidSchema } from '../inputs/uuid.schema'
import { AiGenerationType } from '../types/ai-generation.type'
import { AiPlanDraftType } from '../types/ai-plan-draft.type'

/**
 * AI-programmed sessions. Generating and refining each cost a call to the user's
 * own provider — and a slow one — so both are throttled well below the default,
 * and both are queued rather than run inside the request.
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

    @Mutation(() => AiGenerationType, {
        description:
            'Queue a request to program a planned session, or one exercise of it. Returns the job; watch it and read `draftId` when it succeeds. Supersedes any open draft.',
    })
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async generateSessionPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(generateSessionPlanDraftSchema)) input: GenerateSessionPlanDraftInput,
    ): Promise<AiGenerationType> {
        const command = new QueueSessionPlanGenerationCommand(
            user.userId,
            input.sessionId,
            input.entryId ?? null,
            input.extraInfo ?? null,
        )

        return toGeneration(await this.commandBus.execute<QueueSessionPlanGenerationCommand, AiGenerationView>(command))
    }

    @Mutation(() => AiGenerationType, { description: 'Queue a revision of an open draft.' })
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    async refinePlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(refinePlanDraftSchema)) input: RefinePlanDraftInput,
    ): Promise<AiGenerationType> {
        const command = new QueueSessionPlanRefinementCommand(user.userId, input.draftId, input.message)

        return toGeneration(await this.commandBus.execute<QueueSessionPlanRefinementCommand, AiGenerationView>(command))
    }

    @Mutation(() => AiPlanDraftType, { description: 'Write the draft’s targets onto its session.' })
    async acceptPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<AiPlanDraftType> {
        const command = new AcceptPlanDraftCommand(user.userId, draftId)

        return toType(await this.commandBus.execute<AcceptPlanDraftCommand, AiPlanDraftView>(command))
    }

    @Mutation(() => AiPlanDraftType, {
        description:
            'Pick a past conversation back up: opens a new draft carrying its proposal. Supersedes any open draft on the session.',
    })
    async forkPlanDraft(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<AiPlanDraftType> {
        const command = new ForkPlanDraftCommand(user.userId, draftId)

        return toType(await this.commandBus.execute<ForkPlanDraftCommand, AiPlanDraftView>(command))
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
const toGeneration = (view: AiGenerationView): AiGenerationType => Object.assign(new AiGenerationType(), view)
