import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, ID, Query, Resolver } from '@nestjs/graphql'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { GetAiGenerationQuery } from '../../application/queries/get-ai-generation/get-ai-generation.query'
import type { AiGenerationView } from '../../application/views/ai-generation.view'
import { uuidSchema } from '../inputs/uuid.schema'
import { AiGenerationType } from '../types/ai-generation.type'

/**
 * Where a queued job got to. The client is told to look by SSE and polls this as
 * a fallback, so it is deliberately cheap: one row by primary key, no draft
 * content — that is fetched separately once `draftId` is there.
 */
@Resolver(() => AiGenerationType)
@UseGuards(JwtCookieGuard)
export class AiGenerationResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => AiGenerationType, { description: 'Where one of your AI generations got to.' })
    async aiGeneration(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidSchema)) id: string,
    ): Promise<AiGenerationType> {
        const query = new GetAiGenerationQuery(user.userId, id)
        const view = await this.queryBus.execute<GetAiGenerationQuery, AiGenerationView>(query)

        return Object.assign(new AiGenerationType(), view)
    }
}
