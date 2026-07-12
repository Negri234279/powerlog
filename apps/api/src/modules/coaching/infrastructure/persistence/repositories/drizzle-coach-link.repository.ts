import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import { coachAthlete } from '../schema/coach-athlete.schema'

@Injectable()
export class DrizzleCoachLinkRepository extends CoachLinkRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async areLinked(coachId: string, athleteId: string): Promise<boolean> {
        const [row] = await this.db
            .select({ id: coachAthlete.id })
            .from(coachAthlete)
            .where(and(eq(coachAthlete.coachId, coachId), eq(coachAthlete.athleteId, athleteId)))
            .limit(1)
        return row !== undefined
    }

    async link(coachId: string, athleteId: string, now: Date): Promise<void> {
        // Unique (coach, athlete) makes re-linking idempotent.
        await this.db.insert(coachAthlete).values({ coachId, athleteId, createdAt: now }).onConflictDoNothing()
    }

    async unlink(coachId: string, athleteId: string): Promise<boolean> {
        const removed = await this.db
            .delete(coachAthlete)
            .where(and(eq(coachAthlete.coachId, coachId), eq(coachAthlete.athleteId, athleteId)))
            .returning({ id: coachAthlete.id })
        return removed.length > 0
    }

    async coachIdsOf(athleteId: string): Promise<string[]> {
        const rows = await this.db
            .select({ coachId: coachAthlete.coachId })
            .from(coachAthlete)
            .where(eq(coachAthlete.athleteId, athleteId))
            .orderBy(desc(coachAthlete.createdAt))
        return rows.map((r) => r.coachId)
    }

    async athleteIdsOf(coachId: string): Promise<string[]> {
        const rows = await this.db
            .select({ athleteId: coachAthlete.athleteId })
            .from(coachAthlete)
            .where(eq(coachAthlete.coachId, coachId))
            .orderBy(desc(coachAthlete.createdAt))
        return rows.map((r) => r.athleteId)
    }
}
