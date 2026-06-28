import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import type { SexValue } from '../../../domain/value-objects/sex.vo'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { GetMyProfileQuery } from './get-my-profile.query'

/** Read model returned to the presentation layer (decoupled from the aggregate). */
export interface ProfileView {
    userId: string
    displayName: string
    firstName: string | null
    lastName: string | null
    birthDate: string | null
    sex: SexValue | null
    heightCm: number | null
    bio: string | null
    /** Resolved avatar URL; null → client shows the default. */
    avatarUrl: string | null
    country: string | null
    timezone: string | null
    locale: string | null
    createdAt: Date
    updatedAt: Date
}

/** Maps a Profile aggregate to its read model. `avatarUrl` is resolved by the caller. */
export function toProfileView(profile: ProfileAggregate, avatarUrl: string | null): ProfileView {
    return {
        userId: profile.userId,
        displayName: profile.displayName.value,
        firstName: profile.firstName?.value ?? null,
        lastName: profile.lastName?.value ?? null,
        birthDate: profile.birthDate?.value ?? null,
        sex: profile.sex?.value ?? null,
        heightCm: profile.height?.value ?? null,
        bio: profile.bio?.value ?? null,
        avatarUrl,
        country: profile.country,
        timezone: profile.timezone,
        locale: profile.locale,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    }
}

@QueryHandler(GetMyProfileQuery)
export class GetMyProfileHandler implements IQueryHandler<GetMyProfileQuery, ProfileView> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly avatarUrls: AvatarUrls,
    ) {}

    async execute(query: GetMyProfileQuery): Promise<ProfileView> {
        const profile = await this.profiles.findByUserId(query.userId)
        if (!profile) {
            throw new ProfileNotFoundError()
        }
        return toProfileView(profile, this.avatarUrls.resolve(profile.avatarKey))
    }
}
