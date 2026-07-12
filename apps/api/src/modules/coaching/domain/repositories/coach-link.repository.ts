/**
 * Persistence port for the coach↔athlete m2m link. `link` is idempotent on the
 * unique (coach, athlete) pair. Lists return user ids, newest link first.
 */
export abstract class CoachLinkRepository {
    abstract areLinked(coachId: string, athleteId: string): Promise<boolean>
    abstract link(coachId: string, athleteId: string, now: Date): Promise<void>
    /** Break the link. Returns whether one existed (so callers can stay idempotent). */
    abstract unlink(coachId: string, athleteId: string): Promise<boolean>
    /** Coaches linked to an athlete. */
    abstract coachIdsOf(athleteId: string): Promise<string[]>
    /** Athletes linked to a coach. */
    abstract athleteIdsOf(coachId: string): Promise<string[]>
}
