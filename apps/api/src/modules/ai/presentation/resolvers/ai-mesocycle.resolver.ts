import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Throttle } from '@nestjs/throttler'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { AcceptMesocycleDraftCommand } from '../../application/commands/accept-mesocycle-draft/accept-mesocycle-draft.command'
import { DiscardMesocycleDraftCommand } from '../../application/commands/discard-mesocycle-draft/discard-mesocycle-draft.command'
import { GenerateMesocycleDraftCommand } from '../../application/commands/generate-mesocycle-draft/generate-mesocycle-draft.command'
import { RefineMesocycleDraftCommand } from '../../application/commands/refine-mesocycle-draft/refine-mesocycle-draft.command'
import { GetMesocycleDraftQuery } from '../../application/queries/get-mesocycle-draft/get-mesocycle-draft.query'
import type { AiMesocycleDraftView } from '../../application/views/ai-mesocycle-draft.view'
import { GenerateMesocycleDraftInput, generateMesocycleDraftSchema } from '../inputs/generate-mesocycle-draft.input'
import { RefineMesocycleDraftInput, refineMesocycleDraftSchema } from '../inputs/refine-mesocycle-draft.input'
import { optionalUuidSchema, uuidSchema } from '../inputs/uuid.schema'
import { AiMesocycleDraftType } from '../types/ai-mesocycle-draft.type'

/**
 * AI-designed training blocks. Designing costs a slow call to the user's own
 * provider and reads the whole exercise catalog into the prompt, so it is
 * throttled harder than refining — which replays a conversation that already
 * exists.
 */
@Resolver(() => AiMesocycleDraftType)
@UseGuards(JwtCookieGuard)
export class AiMesocycleResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => AiMesocycleDraftType, {
        nullable: true,
        description:
            'The training block awaiting a decision, if any. One per trainee: omit athleteId for your own, pass it for the one you are designing for that athlete.',
    })
    async mesocycleDraft(
        @CurrentUser() user: AuthUser,
        @Args('athleteId', { type: () => ID, nullable: true }, new ZodValidationPipe(optionalUuidSchema))
        athleteId?: string,
    ): Promise<AiMesocycleDraftType | null> {
        const query = new GetMesocycleDraftQuery(user.userId, athleteId ?? null)
        const view = await this.queryBus.execute<GetMesocycleDraftQuery, AiMesocycleDraftView | null>(query)

        return view ? toType(view) : null
    }

    @Mutation(() => AiMesocycleDraftType, {
        description:
            'Ask the default AI provider to design a training block. Supersedes any open draft for the same trainee.',
    })
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async generateMesocycleDraft(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(generateMesocycleDraftSchema)) input: GenerateMesocycleDraftInput,
    ): Promise<AiMesocycleDraftType> {
        const command = new GenerateMesocycleDraftCommand(
            user.userId,
            input.weeks,
            input.trainingDays,
            input.goal ?? null,
            input.prompt ?? null,
            input.athleteId ?? null,
        )

        return toType(await this.commandBus.execute<GenerateMesocycleDraftCommand, AiMesocycleDraftView>(command))
    }

    @Mutation(() => AiMesocycleDraftType, { description: 'Ask the model to revise an open draft.' })
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async refineMesocycleDraft(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(refineMesocycleDraftSchema)) input: RefineMesocycleDraftInput,
    ): Promise<AiMesocycleDraftType> {
        const command = new RefineMesocycleDraftCommand(user.userId, input.draftId, input.message)

        return toType(await this.commandBus.execute<RefineMesocycleDraftCommand, AiMesocycleDraftView>(command))
    }

    @Mutation(() => AiMesocycleDraftType, {
        description: 'Take the proposal into the builder. Writes nothing — `createMesocycle` still does that.',
    })
    async acceptMesocycleDraft(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<AiMesocycleDraftType> {
        const command = new AcceptMesocycleDraftCommand(user.userId, draftId)

        return toType(await this.commandBus.execute<AcceptMesocycleDraftCommand, AiMesocycleDraftView>(command))
    }

    @Mutation(() => Boolean, { description: 'Throw away a draft.' })
    async discardMesocycleDraft(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<boolean> {
        const command = new DiscardMesocycleDraftCommand(user.userId, draftId)

        return this.commandBus.execute<DiscardMesocycleDraftCommand, boolean>(command)
    }
}

const toType = (view: AiMesocycleDraftView): AiMesocycleDraftType => Object.assign(new AiMesocycleDraftType(), view)
