import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { FindUserIdByHandleQuery } from '../../../../../shared/contracts/find-user-id-by-handle.query'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'

/**
 * Resolves a public handle to its user id. The handle is the profile display
 * name (canonical: lowercase), so the lookup normalizes the input the same way.
 * Used by auth's `UserDirectory` (coaching invites by handle) without crossing a
 * module boundary.
 */
@QueryHandler(FindUserIdByHandleQuery)
export class FindUserIdByHandleHandler implements IQueryHandler<FindUserIdByHandleQuery, string | null> {
    constructor(private readonly profiles: ProfileRepository) {}

    async execute(query: FindUserIdByHandleQuery): Promise<string | null> {
        const profile = await this.profiles.findByDisplayName(query.handle.trim().toLowerCase())
        return profile?.userId ?? null
    }
}
