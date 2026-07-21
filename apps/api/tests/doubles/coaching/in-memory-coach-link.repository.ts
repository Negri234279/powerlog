import { CoachLinkRepository } from '../../../src/modules/coaching/domain/repositories/coach-link.repository'

interface Link {
    coachId: string
    athleteId: string
    createdAt: Date
}

/**
 * In-memory CoachLinkRepository implementing the real abstract interface.
 * `link` is idempotent on the (coach, athlete) pair; lists are newest-first.
 */
export class InMemoryCoachLinkRepository extends CoachLinkRepository {
    private readonly links: Link[] = []

    constructor(seed: Link[] = []) {
        super()
        this.links.push(...seed)
    }

    async areLinked(coachId: string, athleteId: string): Promise<boolean> {
        return this.links.some((l) => l.coachId === coachId && l.athleteId === athleteId)
    }

    async link(coachId: string, athleteId: string, now: Date): Promise<void> {
        if (await this.areLinked(coachId, athleteId)) return
        this.links.push({ coachId, athleteId, createdAt: now })
    }

    async unlink(coachId: string, athleteId: string): Promise<boolean> {
        const index = this.links.findIndex((l) => l.coachId === coachId && l.athleteId === athleteId)
        if (index === -1) return false

        this.links.splice(index, 1)
        return true
    }

    async coachIdsOf(athleteId: string): Promise<string[]> {
        return this.links
            .filter((l) => l.athleteId === athleteId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((l) => l.coachId)
    }

    async athleteIdsOf(coachId: string): Promise<string[]> {
        const rows = await this.athletesOf(coachId)
        return rows.map((r) => r.athleteId)
    }

    async athletesOf(coachId: string): Promise<{ athleteId: string; since: Date }[]> {
        return this.links
            .filter((l) => l.coachId === coachId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((l) => ({ athleteId: l.athleteId, since: l.createdAt }))
    }
}
