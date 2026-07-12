import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import type { CoachUserView } from '../../views'
import { MyCoachesQuery } from './my-coaches.query'

@QueryHandler(MyCoachesQuery)
export class MyCoachesHandler implements IQueryHandler<MyCoachesQuery, CoachUserView[]> {
    constructor(
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: MyCoachesQuery): Promise<CoachUserView[]> {
        const coachIds = await this.links.coachIdsOf(query.athleteId)
        return resolveUsers(coachIds, this.users)
    }
}

/** Resolves user ids to {userId, username}, dropping any that no longer exist. */
export async function resolveUsers(ids: string[], users: UserDirectory): Promise<CoachUserView[]> {
    const resolved = await Promise.all(
        ids.map(async (userId) => {
            const contact = await users.getContact(userId)
            return contact ? { userId, username: contact.username, avatarUrl: contact.avatarUrl ?? null } : null
        }),
    )
    return resolved.filter((u): u is CoachUserView => u !== null)
}
