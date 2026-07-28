import { Injectable } from '@nestjs/common'

import { type CoachedAthlete, CoachLinks } from '../../../../shared/contracts/coach-links'
import { CoachLinkRepository } from '../../domain/repositories/coach-link.repository'

/**
 * Coaching's implementation of the cross-module `CoachLinks` contract. Delegates
 * to the link repository so the check stays behind the same persistence port.
 */
@Injectable()
export class CoachingCoachLinks extends CoachLinks {
    constructor(private readonly links: CoachLinkRepository) {
        super()
    }

    async areLinked(coachId: string, athleteId: string): Promise<boolean> {
        return this.links.areLinked(coachId, athleteId)
    }

    async athletesOf(coachId: string): Promise<CoachedAthlete[]> {
        return this.links.athletesOf(coachId)
    }

    async counterpartyIdsOf(userId: string): Promise<string[]> {
        // A user can be both a coach and an athlete; union both directions and
        // dedupe (the same pair can't appear twice, but be safe).
        const [coaches, athletes] = await Promise.all([this.links.coachIdsOf(userId), this.links.athleteIdsOf(userId)])
        return [...new Set([...coaches, ...athletes])]
    }
}
