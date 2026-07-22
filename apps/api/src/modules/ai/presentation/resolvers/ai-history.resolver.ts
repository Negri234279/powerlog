import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { GetMesocycleDraftByIdQuery } from '../../application/queries/get-mesocycle-draft-by-id/get-mesocycle-draft-by-id.query'
import { GetPlanDraftQuery } from '../../application/queries/get-plan-draft/get-plan-draft.query'
import type { AiDraftHistoryPage } from '../../application/queries/list-ai-drafts/list-ai-drafts.handler'
import { ListAiDraftsQuery } from '../../application/queries/list-ai-drafts/list-ai-drafts.query'
import type { AiMesocycleDraftView } from '../../application/views/ai-mesocycle-draft.view'
import type { AiPlanDraftView } from '../../application/views/ai-plan-draft.view'
import { AI_DRAFT_KINDS } from '../../application/ports/ai-draft-history.read-model'
import { PLAN_DRAFT_STATUSES } from '../../domain/value-objects/plan-draft-status.vo'
import { uuidSchema } from '../inputs/uuid.schema'
import { AiDraftHistoryPageType } from '../types/ai-draft-summary.type'
import { AiMesocycleDraftType } from '../types/ai-mesocycle-draft.type'
import { AiPlanDraftType } from '../types/ai-plan-draft.type'

const DEFAULT_LIMIT = 20

const limitArg = z.coerce.number().int().min(1).max(50).optional()
const kindArg = z.enum(AI_DRAFT_KINDS).optional()
const statusArg = z.enum(PLAN_DRAFT_STATUSES).optional()
const optionalUuid = uuidSchema.optional()
// `self` is not an id: it asks for the caller's own blocks (athlete_id is null).
const athleteArg = z.union([z.literal('self'), uuidSchema]).optional()
const cursorArg = z.string().min(1).optional()

/**
 * The AI conversation history: everything the caller ever asked the model to
 * design, resolved or not. Reads only — generating, refining and resolving a
 * draft live on the resolvers for each kind.
 */
@Resolver()
@UseGuards(JwtCookieGuard)
export class AiHistoryResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => AiDraftHistoryPageType, {
        description: 'Your AI drafts, most recent activity first. Session and mesocycle drafts in one feed.',
    })
    async aiDraftHistory(
        @CurrentUser() user: AuthUser,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('kind', { type: () => String, nullable: true }, new ZodValidationPipe(kindArg))
        kind?: 'session' | 'mesocycle',
        @Args('status', { type: () => String, nullable: true }, new ZodValidationPipe(statusArg))
        status?: 'open' | 'accepted' | 'discarded',
        @Args('sessionId', { type: () => ID, nullable: true }, new ZodValidationPipe(optionalUuid)) sessionId?: string,
        @Args(
            'athleteId',
            { type: () => String, nullable: true, description: 'An athlete’s id, or "self" for your own blocks.' },
            new ZodValidationPipe(athleteArg),
        )
        athleteId?: string,
        @Args('cursor', { type: () => String, nullable: true }, new ZodValidationPipe(cursorArg)) cursor?: string,
    ): Promise<AiDraftHistoryPage> {
        const query = new ListAiDraftsQuery(
            user.userId,
            limit ?? DEFAULT_LIMIT,
            kind,
            status,
            sessionId,
            athleteId as string | 'self' | undefined,
            cursor,
        )

        return this.queryBus.execute<ListAiDraftsQuery, AiDraftHistoryPage>(query)
    }

    @Query(() => AiPlanDraftType, {
        description: 'One session draft by id, whatever its status — the history’s detail view.',
    })
    async planDraftById(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<AiPlanDraftType> {
        const query = new GetPlanDraftQuery(user.userId, draftId)
        const view = await this.queryBus.execute<GetPlanDraftQuery, AiPlanDraftView>(query)

        return Object.assign(new AiPlanDraftType(), view)
    }

    @Query(() => AiMesocycleDraftType, {
        description: 'One mesocycle draft by id, whatever its status — the history’s detail view.',
    })
    async mesocycleDraftById(
        @CurrentUser() user: AuthUser,
        @Args('draftId', { type: () => ID }, new ZodValidationPipe(uuidSchema)) draftId: string,
    ): Promise<AiMesocycleDraftType> {
        const query = new GetMesocycleDraftByIdQuery(user.userId, draftId)
        const view = await this.queryBus.execute<GetMesocycleDraftByIdQuery, AiMesocycleDraftView>(query)

        return Object.assign(new AiMesocycleDraftType(), view)
    }
}
