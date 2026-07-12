import {
    type CoachNoteView,
    CoachNoteRepository,
} from '../../../src/modules/coaching/domain/repositories/coach-note.repository'

/**
 * In-memory CoachNoteRepository implementing the real abstract interface.
 * Stores one note per (coach, athlete) key.
 */
export class InMemoryCoachNoteRepository extends CoachNoteRepository {
    private readonly byKey = new Map<string, CoachNoteView>()

    private key(coachId: string, athleteId: string): string {
        return `${coachId}:${athleteId}`
    }

    async get(coachId: string, athleteId: string): Promise<CoachNoteView | null> {
        return this.byKey.get(this.key(coachId, athleteId)) ?? null
    }

    async upsert(coachId: string, athleteId: string, body: string, now: Date): Promise<void> {
        this.byKey.set(this.key(coachId, athleteId), { body, updatedAt: now })
    }

    async clear(coachId: string, athleteId: string): Promise<void> {
        this.byKey.delete(this.key(coachId, athleteId))
    }
}
