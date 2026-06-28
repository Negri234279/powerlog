import { Inject, Injectable } from '@nestjs/common'
import { count, countDistinct, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AdminCoachingStats,
    AdminCoachingStatsReadModel,
} from '../../../application/ports/admin-coaching-stats.read-model'
import { coachAthlete } from '../schema/coach-athlete.schema'
import { coachAthleteInvitations } from '../schema/coach-athlete-invitations.schema'

@Injectable()
export class DrizzleAdminCoachingStatsReadModel extends AdminCoachingStatsReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async read(): Promise<AdminCoachingStats> {
        const [links] = await this.db
            .select({
                total: count(),
                coaches: countDistinct(coachAthlete.coachId),
                athletes: countDistinct(coachAthlete.athleteId),
            })
            .from(coachAthlete)

        const [pending] = await this.db
            .select({ value: count() })
            .from(coachAthleteInvitations)
            .where(eq(coachAthleteInvitations.status, 'pending'))

        return {
            links: Number(links?.total ?? 0),
            activeCoaches: Number(links?.coaches ?? 0),
            linkedAthletes: Number(links?.athletes ?? 0),
            pendingInvitations: Number(pending?.value ?? 0),
        }
    }
}
