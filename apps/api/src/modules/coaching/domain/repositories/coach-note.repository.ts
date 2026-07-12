/** A coach's private note on an athlete, as read back. */
export interface CoachNoteView {
    body: string
    updatedAt: Date
}

/**
 * Persistence port for a coach's private per-athlete note. Keyed by the (coach,
 * athlete) pair; `upsert` replaces the body, `clear` removes it. There is no
 * entity — the note is just keyed free text, like the coach↔athlete link.
 */
export abstract class CoachNoteRepository {
    abstract get(coachId: string, athleteId: string): Promise<CoachNoteView | null>
    abstract upsert(coachId: string, athleteId: string, body: string, now: Date): Promise<void>
    abstract clear(coachId: string, athleteId: string): Promise<void>
}
