import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetUserCoachingQuery } from '../../../../../shared/contracts/get-user-coaching.query'
import type { UserCoachingSummary } from '../../../../../shared/contracts/user-coaching'
import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import { resolveUsers } from '../my-coaches/my-coaches.handler'

/** Cap on the athletes resolved for the admin card; `athleteCount` stays exact. */
const ATHLETE_SAMPLE = 50

/**
 * A user's coaching relationships for the admin detail: the coaches over them and
 * the athletes under them. Resolves both directions of the link through the same
 * `UserDirectory` the my-coaches/my-athletes queries use, so identities render
 * the same way everywhere. The athlete list is sampled — a coach may have many —
 * while the count is the honest total.
 */
@QueryHandler(GetUserCoachingQuery)
export class GetUserCoachingHandler implements IQueryHandler<GetUserCoachingQuery, UserCoachingSummary> {
    constructor(
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: GetUserCoachingQuery): Promise<UserCoachingSummary> {
        const [coachIds, athleteIds] = await Promise.all([
            this.links.coachIdsOf(query.userId),
            this.links.athleteIdsOf(query.userId),
        ])

        const [coaches, athletes] = await Promise.all([
            resolveUsers(coachIds, this.users),
            resolveUsers(athleteIds.slice(0, ATHLETE_SAMPLE), this.users),
        ])

        return { coaches, athleteCount: athleteIds.length, athletes }
    }
}
