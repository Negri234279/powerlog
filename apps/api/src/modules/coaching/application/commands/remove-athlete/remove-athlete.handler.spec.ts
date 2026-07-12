import { describe, expect, it } from 'vitest'

import { FakeCoachingMetrics, InMemoryCoachLinkRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { CoachLinkRemovedIntegrationEvent } from '../../../../../shared/integration-events/coach-link-removed.integration-event'
import { NotYourAthleteError } from '../../../domain/errors/coaching.errors'
import { CoachUnlinker } from '../../services/coach-unlinker.service'
import { RemoveAthleteCommand } from './remove-athlete.command'
import { RemoveAthleteHandler } from './remove-athlete.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const LINKED_AT = new Date('2026-01-01T00:00:00.000Z')

function setup(linked = true) {
    const links = new InMemoryCoachLinkRepository(
        linked ? [{ coachId: COACH, athleteId: ATHLETE, createdAt: LINKED_AT }] : [],
    )
    const users = new FakeUserDirectory()
        .seed(COACH, { username: 'thecoach', email: 'coach@powerlog.dev' })
        .seed(ATHLETE, { username: 'theathlete', email: 'athlete@powerlog.dev' })
    const events = new RecordingEventBus()
    const metrics = new FakeCoachingMetrics()
    const handler = new RemoveAthleteHandler(new CoachUnlinker(links, users, metrics, events.asEventBus()))

    return { links, events, handler, metrics }
}

describe('RemoveAthleteHandler', () => {
    it('breaks the link and announces who ended it', async () => {
        const { links, events, handler, metrics } = setup()

        const result = await handler.execute(new RemoveAthleteCommand(COACH, ATHLETE))

        expect(result).toBe(true)
        expect(await links.areLinked(COACH, ATHLETE)).toBe(false)
        expect(events.firstOf(CoachLinkRemovedIntegrationEvent)).toMatchObject({
            coachId: COACH,
            athleteId: ATHLETE,
            coachUsername: 'thecoach',
            athleteUsername: 'theathlete',
            unlinkedBy: 'coach',
        })
        expect(metrics.linksRemoved).toEqual(['coach'])
    })

    it('rejects removing someone who is not their athlete', async () => {
        const { events, handler } = setup(false)

        await expect(handler.execute(new RemoveAthleteCommand(COACH, ATHLETE))).rejects.toBeInstanceOf(
            NotYourAthleteError,
        )
        expect(events.published).toHaveLength(0)
    })

    it('does not touch the reverse link (the athlete may coach someone too)', async () => {
        const { links, handler } = setup()
        await links.link(ATHLETE, COACH, LINKED_AT)

        await handler.execute(new RemoveAthleteCommand(COACH, ATHLETE))

        expect(await links.areLinked(ATHLETE, COACH)).toBe(true)
    })
})
