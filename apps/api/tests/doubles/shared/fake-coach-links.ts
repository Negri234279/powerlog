import { CoachLinks } from '../../../src/shared/contracts/coach-links'

/** In-memory CoachLinks double (shared contract). Seed linked (coach, athlete) pairs. */
export class FakeCoachLinks extends CoachLinks {
    private readonly pairs = new Set<string>()

    link(coachId: string, athleteId: string): this {
        this.pairs.add(`${coachId}:${athleteId}`)
        return this
    }

    async areLinked(coachId: string, athleteId: string): Promise<boolean> {
        return this.pairs.has(`${coachId}:${athleteId}`)
    }
}
