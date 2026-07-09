import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Throttle } from '@nestjs/throttler'

import type { LlmModel } from '../../../../ai/llm-provider.port'
import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { DeleteAiProviderKeyCommand } from '../../application/commands/delete-ai-provider-key/delete-ai-provider-key.command'
import { SetAiProviderDefaultCommand } from '../../application/commands/set-ai-provider-default/set-ai-provider-default.command'
import { SetAiProviderEnabledCommand } from '../../application/commands/set-ai-provider-enabled/set-ai-provider-enabled.command'
import { SetAiProviderKeyCommand } from '../../application/commands/set-ai-provider-key/set-ai-provider-key.command'
import { UpdateAiProviderModelCommand } from '../../application/commands/update-ai-provider-model/update-ai-provider-model.command'
import { GetMyAiSettingsQuery } from '../../application/queries/get-my-ai-settings/get-my-ai-settings.query'
import { ListAiModelsQuery } from '../../application/queries/list-ai-models/list-ai-models.query'
import type { AiProviderConfigView } from '../../application/views/ai-provider-config.view'
import { aiProviderSchema } from '../inputs/ai-provider.schema'
import { SetAiProviderEnabledInput, setAiProviderEnabledSchema } from '../inputs/set-ai-provider-enabled.input'
import { SetAiProviderKeyInput, setAiProviderKeySchema } from '../inputs/set-ai-provider-key.input'
import { UpdateAiProviderModelInput, updateAiProviderModelSchema } from '../inputs/update-ai-provider-model.input'
import { AiModelType } from '../types/ai-model.type'
import { AiProviderConfigType } from '../types/ai-provider-config.type'

/**
 * BYOK settings. Everything here is scoped to the authenticated user, and the
 * stored API key never leaves the server — no query returns it, in any form.
 *
 * `setAiProviderKey` and `aiModels` each make a live call to the provider, so
 * both are throttled more tightly than the default: a loop over them would
 * hammer the user's own rate limit.
 */
@Resolver(() => AiProviderConfigType)
@UseGuards(JwtCookieGuard)
export class AiSettingsResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => [AiProviderConfigType], { description: 'Providers the authenticated user has configured.' })
    async myAiSettings(@CurrentUser() user: AuthUser): Promise<AiProviderConfigType[]> {
        const query = new GetMyAiSettingsQuery(user.userId)
        const views = await this.queryBus.execute<GetMyAiSettingsQuery, AiProviderConfigView[]>(query)

        return views.map(toType)
    }

    @Query(() => [AiModelType], { description: 'Models the stored key may call, fetched live from the provider.' })
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    async aiModels(
        @CurrentUser() user: AuthUser,
        @Args('provider', new ZodValidationPipe(aiProviderSchema)) provider: string,
    ): Promise<AiModelType[]> {
        const query = new ListAiModelsQuery(user.userId, provider)
        const models = await this.queryBus.execute<ListAiModelsQuery, LlmModel[]>(query)

        return models.map((model) => Object.assign(new AiModelType(), model))
    }

    @Mutation(() => AiProviderConfigType, {
        description: 'Store or replace the API key for a provider. Verified against the provider first.',
    })
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async setAiProviderKey(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(setAiProviderKeySchema)) input: SetAiProviderKeyInput,
    ): Promise<AiProviderConfigType> {
        const command = new SetAiProviderKeyCommand(user.userId, input.provider, input.apiKey, input.model)

        return toType(await this.commandBus.execute<SetAiProviderKeyCommand, AiProviderConfigView>(command))
    }

    @Mutation(() => AiProviderConfigType, { description: 'Select the model used for a configured provider.' })
    async updateAiProviderModel(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(updateAiProviderModelSchema)) input: UpdateAiProviderModelInput,
    ): Promise<AiProviderConfigType> {
        const command = new UpdateAiProviderModelCommand(user.userId, input.provider, input.model)

        return toType(await this.commandBus.execute<UpdateAiProviderModelCommand, AiProviderConfigView>(command))
    }

    @Mutation(() => AiProviderConfigType, { description: 'Enable or disable a configured provider.' })
    async setAiProviderEnabled(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(setAiProviderEnabledSchema)) input: SetAiProviderEnabledInput,
    ): Promise<AiProviderConfigType> {
        const command = new SetAiProviderEnabledCommand(user.userId, input.provider, input.enabled)

        return toType(await this.commandBus.execute<SetAiProviderEnabledCommand, AiProviderConfigView>(command))
    }

    @Mutation(() => AiProviderConfigType, {
        description: 'Make this the provider the AI features use. Any previous default steps down.',
    })
    async setAiProviderDefault(
        @CurrentUser() user: AuthUser,
        @Args('provider', new ZodValidationPipe(aiProviderSchema)) provider: string,
    ): Promise<AiProviderConfigType> {
        const command = new SetAiProviderDefaultCommand(user.userId, provider)

        return toType(await this.commandBus.execute<SetAiProviderDefaultCommand, AiProviderConfigView>(command))
    }

    @Mutation(() => Boolean, { description: 'Forget the stored key for a provider. Idempotent.' })
    async deleteAiProviderKey(
        @CurrentUser() user: AuthUser,
        @Args('provider', new ZodValidationPipe(aiProviderSchema)) provider: string,
    ): Promise<boolean> {
        const command = new DeleteAiProviderKeyCommand(user.userId, provider)

        return this.commandBus.execute<DeleteAiProviderKeyCommand, boolean>(command)
    }
}

const toType = (view: AiProviderConfigView): AiProviderConfigType => Object.assign(new AiProviderConfigType(), view)
