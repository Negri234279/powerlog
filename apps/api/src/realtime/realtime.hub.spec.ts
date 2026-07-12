import type { MessageEvent } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { counterValue, gaugeValue, testCounter, testGauge } from '../../tests/doubles/shared'
import { InMemoryRealtimeBus } from './bus/in-memory-realtime.bus'
import { RealtimeHub } from './realtime.hub'

function setup() {
    const connections = testGauge()
    const published = testCounter(['type'])

    return { hub: new RealtimeHub(new InMemoryRealtimeBus(), connections, published), connections, published }
}

/** Collects what a user's stream delivers, and lets the test close it. */
function listen(hub: RealtimeHub, userId: string) {
    const received: MessageEvent['data'][] = []
    let completed = false

    const subscription = hub.streamFor(userId).subscribe({
        next: (message) => received.push(message.data),
        complete: () => {
            completed = true
        },
    })

    return { received, subscription, isCompleted: () => completed }
}

afterEach(() => {
    vi.useRealTimers()
})

describe('RealtimeHub', () => {
    it('delivers an event only to the addressed user', () => {
        const { hub } = setup()
        const coach = listen(hub, 'coach-1')
        const athlete = listen(hub, 'athlete-1')

        hub.publish(['coach-1'], { type: 'athlete_linked' })

        expect(coach.received).toEqual([{ type: 'athlete_linked' }])
        expect(athlete.received).toEqual([])
    })

    it('fans one event out to every addressed user', () => {
        const { hub } = setup()
        const coach = listen(hub, 'coach-1')
        const athlete = listen(hub, 'athlete-1')

        hub.publish(['coach-1', 'athlete-1'], { type: 'coach_unlinked' })

        expect(coach.received).toEqual([{ type: 'coach_unlinked' }])
        expect(athlete.received).toEqual([{ type: 'coach_unlinked' }])
    })

    it('drops events for users with no open stream instead of queueing them', () => {
        const { hub } = setup()

        hub.publish(['coach-1'], { type: 'athlete_linked' })
        const coach = listen(hub, 'coach-1')

        // The stream is live-only: connecting afterwards must not replay it (the
        // client refetches on connect anyway).
        expect(coach.received).toEqual([])
    })

    it('keeps an idle stream alive with a heartbeat', () => {
        vi.useFakeTimers()
        const { hub } = setup()
        const coach = listen(hub, 'coach-1')

        vi.advanceTimersByTime(60_000)

        expect(coach.received).toEqual([{ type: 'ping' }, { type: 'ping' }])
    })

    it('completes open streams on shutdown so the graceful drain can finish', () => {
        const { hub } = setup()
        const coach = listen(hub, 'coach-1')

        hub.onApplicationShutdown()

        expect(coach.isCompleted()).toBe(true)
    })

    it('tracks open connections and published events as metrics', async () => {
        const { hub, connections, published } = setup()

        const coach = listen(hub, 'coach-1')
        const athlete = listen(hub, 'athlete-1')
        expect(await gaugeValue(connections)).toBe(2)

        hub.publish(['coach-1', 'athlete-1'], { type: 'coach_unlinked' })
        expect(await counterValue(published, { type: 'coach_unlinked' })).toBe(2)

        coach.subscription.unsubscribe()
        athlete.subscription.unsubscribe()
        expect(await gaugeValue(connections)).toBe(0)
    })
})
