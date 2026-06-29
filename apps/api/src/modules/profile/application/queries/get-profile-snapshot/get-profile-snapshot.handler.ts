import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetProfileSnapshotQuery } from '../../../../../shared/contracts/get-profile-snapshot.query'
import type { ProfileSnapshot } from '../../../../../shared/contracts/profile-snapshot-reader'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import { AvatarUrls } from '../../services/avatar-urls.service'

/**
 * Resolves the public profile snapshot (handle + resolved avatar URL) that auth
 * stamps into the access JWT at sign time. Returns null when the user has no
 * profile yet (e.g. a brand-new Google sign-up before provisioning), so the
 * caller can fall back to a null avatar.
 */
@QueryHandler(GetProfileSnapshotQuery)
export class GetProfileSnapshotHandler implements IQueryHandler<GetProfileSnapshotQuery, ProfileSnapshot | null> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly avatarUrls: AvatarUrls,
    ) {}

    async execute(query: GetProfileSnapshotQuery): Promise<ProfileSnapshot | null> {
        const profile = await this.profiles.findByUserId(query.userId)
        if (!profile) return null

        return {
            username: profile.displayName.value,
            avatarUrl: this.avatarUrls.resolve(profile.avatarKey, profile.updatedAt),
        }
    }
}
