import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import type { CoachUserView } from '../../views'
import { resolveUsers } from '../my-coaches/my-coaches.handler'
import { MyAthleteQuery } from './my-athlete.query'

@QueryHandler(MyAthleteQuery)
export class MyAthleteHandler implements IQueryHandler<MyAthleteQuery, CoachUserView | null> {
    constructor(
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: MyAthleteQuery): Promise<CoachUserView | null> {
        // Null rather than an error for both halves of "no": an athlete who is
        // not linked to this coach and one who no longer exists are the same
        // answer here, so the caller can't probe for which. The client renders
        // it as a not-found state, not as a failure.
        const linked = await this.links.areLinked(query.coachId, query.athleteId)
        if (!linked) return null

        const [athlete] = await resolveUsers([query.athleteId], this.users)

        return athlete ?? null
    }
}
