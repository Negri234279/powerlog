import { describe, expect, it } from 'vitest'

import { InMemoryCoachLinkRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { CoachLinkRemovedIntegrationEvent } from '../../../../../shared/integration-events/coach-link-removed.integration-event'
import { NotYourCoachError } from '../../../domain/errors/coaching.errors'
import { CoachUnlinker } from '../../services/coach-unlinker.service'
import { LeaveCoachCommand } from './leave-coach.command'
import { LeaveCoachHandler } from './leave-coach.handler'

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
    const handler = new LeaveCoachHandler(new CoachUnlinker(links, users, events.asEventBus()))

    return { links, events, handler }
}

describe('LeaveCoachHandler', () => {
    it('lets the athlete break the link and announces they left', async () => {
        const { links, events, handler } = setup()

        const result = await handler.execute(new LeaveCoachCommand(ATHLETE, COACH))

        expect(result).toBe(true)
        expect(await links.areLinked(COACH, ATHLETE)).toBe(false)
        expect(events.firstOf(CoachLinkRemovedIntegrationEvent)).toMatchObject({
            coachId: COACH,
            athleteId: ATHLETE,
            unlinkedBy: 'athlete',
        })
    })

    it('rejects leaving someone who is not their coach', async () => {
        const { events, handler } = setup(false)

        await expect(handler.execute(new LeaveCoachCommand(ATHLETE, COACH))).rejects.toBeInstanceOf(NotYourCoachError)
        expect(events.published).toHaveLength(0)
    })
})
