import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import type { CoachUserView } from '../../views'
import { resolveUsers } from '../my-coaches/my-coaches.handler'
import { MyAthletesQuery } from './my-athletes.query'

@QueryHandler(MyAthletesQuery)
export class MyAthletesHandler implements IQueryHandler<MyAthletesQuery, CoachUserView[]> {
    constructor(
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: MyAthletesQuery): Promise<CoachUserView[]> {
        const athleteIds = await this.links.athleteIdsOf(query.coachId)
        return resolveUsers(athleteIds, this.users)
    }
}
