import { type CoachedAthlete, CoachLinks } from '../../../src/shared/contracts/coach-links'

const EPOCH = new Date('2026-01-01T00:00:00.000Z')

/** In-memory CoachLinks double (shared contract). Seed linked (coach, athlete) pairs. */
export class FakeCoachLinks extends CoachLinks {
    private readonly pairs = new Map<string, Date>()

    /** `since` defaults to a fixed date; pass one when the test cares about link age. */
    link(coachId: string, athleteId: string, since: Date = EPOCH): this {
        this.pairs.set(`${coachId}:${athleteId}`, since)
        return this
    }

    /** Break a link, modelling `removeAthlete`/`leaveCoach`. */
    unlink(coachId: string, athleteId: string): this {
        this.pairs.delete(`${coachId}:${athleteId}`)
        return this
    }

    async areLinked(coachId: string, athleteId: string): Promise<boolean> {
        return this.pairs.has(`${coachId}:${athleteId}`)
    }

    async athletesOf(coachId: string): Promise<CoachedAthlete[]> {
        return [...this.pairs.entries()]
            .filter(([pair]) => pair.startsWith(`${coachId}:`))
            .map(([pair, since]) => ({ athleteId: pair.slice(coachId.length + 1), since }))
    }

    async counterpartyIdsOf(userId: string): Promise<string[]> {
        const counterparties = new Set<string>()
        for (const pair of this.pairs.keys()) {
            const [coachId, athleteId] = pair.split(':') as [string, string]
            if (coachId === userId) counterparties.add(athleteId)
            if (athleteId === userId) counterparties.add(coachId)
        }
        return [...counterparties]
    }
}
