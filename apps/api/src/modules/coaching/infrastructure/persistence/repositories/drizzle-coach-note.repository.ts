import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { type CoachNoteView, CoachNoteRepository } from '../../../domain/repositories/coach-note.repository'
import { coachAthleteNotes } from '../schema/coach-athlete-notes.schema'

@Injectable()
export class DrizzleCoachNoteRepository extends CoachNoteRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async get(coachId: string, athleteId: string): Promise<CoachNoteView | null> {
        const [row] = await this.db
            .select({ body: coachAthleteNotes.body, updatedAt: coachAthleteNotes.updatedAt })
            .from(coachAthleteNotes)
            .where(and(eq(coachAthleteNotes.coachId, coachId), eq(coachAthleteNotes.athleteId, athleteId)))
            .limit(1)
        return row ?? null
    }

    async upsert(coachId: string, athleteId: string, body: string, now: Date): Promise<void> {
        await this.db
            .insert(coachAthleteNotes)
            .values({ coachId, athleteId, body, createdAt: now, updatedAt: now })
            .onConflictDoUpdate({
                target: [coachAthleteNotes.coachId, coachAthleteNotes.athleteId],
                set: { body, updatedAt: now },
            })
    }

    async clear(coachId: string, athleteId: string): Promise<void> {
        await this.db
            .delete(coachAthleteNotes)
            .where(and(eq(coachAthleteNotes.coachId, coachId), eq(coachAthleteNotes.athleteId, athleteId)))
    }
}
