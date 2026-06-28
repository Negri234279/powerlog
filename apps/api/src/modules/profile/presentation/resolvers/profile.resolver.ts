import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { UpdateProfileCommand } from '../../application/commands/update-profile/update-profile.command'
import { type ProfileView } from '../../application/queries/get-my-profile/get-my-profile.handler'
import { GetMyProfileQuery } from '../../application/queries/get-my-profile/get-my-profile.query'
import { UpdateProfileInput, updateProfileSchema } from '../inputs/update-profile.input'
import { ProfileType } from '../types/profile.type'

@Resolver(() => ProfileType)
@UseGuards(JwtCookieGuard)
export class ProfileResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => ProfileType, { description: "The authenticated user's profile." })
    async myProfile(@CurrentUser() user: AuthUser): Promise<ProfileType> {
        return this.load(user.userId)
    }

    @Mutation(() => ProfileType, { description: 'Update the authenticated user’s profile fields.' })
    async updateProfile(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
    ): Promise<ProfileType> {
        const view = await this.commandBus.execute<UpdateProfileCommand, ProfileView>(
            new UpdateProfileCommand(user.userId, input),
        )
        return Object.assign(new ProfileType(), view)
    }

    private async load(userId: string): Promise<ProfileType> {
        const view = await this.queryBus.execute<GetMyProfileQuery, ProfileView>(new GetMyProfileQuery(userId))
        return Object.assign(new ProfileType(), view)
    }
}
