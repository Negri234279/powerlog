import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { type CoachNoteView, CoachNoteRepository } from '../../../domain/repositories/coach-note.repository'
import { GetAthleteNoteQuery } from './get-athlete-note.query'

@QueryHandler(GetAthleteNoteQuery)
export class GetAthleteNoteHandler implements IQueryHandler<GetAthleteNoteQuery, CoachNoteView | null> {
    constructor(private readonly notes: CoachNoteRepository) {}

    execute(query: GetAthleteNoteQuery): Promise<CoachNoteView | null> {
        // The note is keyed by the caller's own id, so a coach only ever gets
        // their own note — no cross-coach leakage possible.
        return this.notes.get(query.coachId, query.athleteId)
    }
}
