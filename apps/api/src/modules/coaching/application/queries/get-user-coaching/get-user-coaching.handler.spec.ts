import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { GetUserCoachingQuery } from '../../../../../shared/contracts/get-user-coaching.query'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { InMemoryCoachLinkRepository } from '../../../../../../tests/doubles/coaching'
import { GetUserCoachingHandler } from './get-user-coaching.handler'

const NOW = new Date('2026-07-01T00:00:00.000Z')

/** A user directory seeded so every id resolves to a card with a handle. */
function directoryFor(...ids: string[]): FakeUserDirectory {
    const users = new FakeUserDirectory()
    for (const id of ids) users.seed(id, { email: `${id}@x.test`, username: id.slice(0, 8) })
    return users
}

describe('GetUserCoachingHandler', () => {
    it('should_resolve_the_coaches_over_an_athlete', async () => {
        const athlete = randomUUID()
        const coach = randomUUID()
        const links = new InMemoryCoachLinkRepository()
        await links.link(coach, athlete, NOW)
        const handler = new GetUserCoachingHandler(links, directoryFor(coach, athlete))

        const result = await handler.execute(new GetUserCoachingQuery(athlete))

        expect(result.coaches.map((c) => c.userId)).toEqual([coach])
        expect(result.athleteCount).toBe(0)
        expect(result.athletes).toEqual([])
    })

    it('should_report_the_athletes_under_a_coach_with_an_exact_count', async () => {
        const coach = randomUUID()
        const athletes = [randomUUID(), randomUUID(), randomUUID()]
        const links = new InMemoryCoachLinkRepository()
        for (const a of athletes) await links.link(coach, a, NOW)
        const handler = new GetUserCoachingHandler(links, directoryFor(coach, ...athletes))

        const result = await handler.execute(new GetUserCoachingQuery(coach))

        expect(result.athleteCount).toBe(3)
        expect(result.athletes).toHaveLength(3)
        expect(result.coaches).toEqual([])
    })

    it('should_cap_the_athlete_sample_at_50_while_keeping_the_count_honest', async () => {
        const coach = randomUUID()
        const athletes = Array.from({ length: 60 }, () => randomUUID())
        const links = new InMemoryCoachLinkRepository()
        for (const a of athletes) await links.link(coach, a, NOW)
        const handler = new GetUserCoachingHandler(links, directoryFor(coach, ...athletes))

        const result = await handler.execute(new GetUserCoachingQuery(coach))

        expect(result.athleteCount).toBe(60)
        expect(result.athletes).toHaveLength(50)
    })

    it('should_count_a_link_whose_user_is_gone_but_drop_it_from_the_resolved_cards', async () => {
        const coach = randomUUID()
        const present = randomUUID()
        const gone = randomUUID()
        const links = new InMemoryCoachLinkRepository()
        await links.link(coach, present, NOW)
        await links.link(coach, gone, NOW)
        // Directory knows the coach and the present athlete, but not the gone one.
        const handler = new GetUserCoachingHandler(links, directoryFor(coach, present))

        const result = await handler.execute(new GetUserCoachingQuery(coach))

        expect(result.athleteCount).toBe(2)
        expect(result.athletes.map((a) => a.userId)).toEqual([present])
    })
})
