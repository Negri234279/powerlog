import { Redis } from 'ioredis'
import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { silentLogger } from '../../../tests/doubles/shared'
import { REALTIME_CHANNEL, RedisRealtimeBus } from '../bus/redis-realtime.bus'
import type { RealtimeMessage } from '../realtime.bus'

let container: StartedTestContainer
let url: string

const clients: Redis[] = []
const PROBE_USER = '__probe__'

/** A bus as a *separate API instance* would build it: its own client, its own
 *  origin id — everything the two replicas would not share. */
async function startInstance(): Promise<{ bus: RedisRealtimeBus; received: RealtimeMessage[] }> {
    const client = new Redis(url, { maxRetriesPerRequest: null })
    clients.push(client)

    const bus = new RedisRealtimeBus(client, silentLogger())
    const received: RealtimeMessage[] = []
    let listening = false

    bus.messages$.subscribe((message) => {
        // Probes are readiness plumbing, never test data: a retry can still be in
        // flight when the instance is declared ready, so they must never be
        // recorded rather than cleared afterwards.
        if (message.userId === PROBE_USER) {
            listening = true
            return
        }

        received.push(message)
    })

    bus.onModuleInit()
    await waitUntilListening(() => listening)

    return { bus, received }
}

/**
 * Subscribing happens asynchronously (on the connection's `ready`), and a message
 * published before this instance is listening is simply lost — as it would be in
 * production. Counting channel subscribers isn't enough to know *this* instance is
 * one of them (another instance already makes the count non-zero), so we publish a
 * probe until this instance's own stream sees it come back.
 */
async function waitUntilListening(listening: () => boolean): Promise<void> {
    const probe = new Redis(url, { maxRetriesPerRequest: null })
    const envelope = JSON.stringify({
        origin: 'probe',
        userId: PROBE_USER,
        event: { type: 'coach_linked' },
    })

    await waitFor(async () => {
        await probe.publish(REALTIME_CHANNEL, envelope)

        return listening()
    })

    probe.disconnect()
}

async function waitFor(condition: () => Promise<boolean>, timeoutMs = 5_000): Promise<void> {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
        if (await condition()) return
        await new Promise((resolve) => setTimeout(resolve, 25))
    }

    throw new Error('condition not met in time')
}

beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start()
    url = `redis://${container.getHost()}:${container.getMappedPort(6379)}`
}, 180_000)

afterAll(async () => {
    for (const client of clients) client.disconnect()
    await container?.stop()
})

describe('RedisRealtimeBus', () => {
    it('delivers an event published on one instance to a stream held by another', async () => {
        const a = await startInstance()
        const b = await startInstance()

        a.bus.publish({ userId: 'coach-1', event: { type: 'athlete_linked' } })

        await waitFor(async () => b.received.length > 0)
        expect(b.received).toEqual([{ userId: 'coach-1', event: { type: 'athlete_linked' } }])

        await a.bus.onApplicationShutdown()
        await b.bus.onApplicationShutdown()
    })

    it('delivers exactly once on the publishing instance, without waiting for the round trip', async () => {
        const a = await startInstance()
        const b = await startInstance()

        a.bus.publish({ userId: 'coach-1', event: { type: 'athlete_linked' } })

        // Local-first: the publisher's own clients have it synchronously…
        expect(a.received).toEqual([{ userId: 'coach-1', event: { type: 'athlete_linked' } }])

        // …and its own message coming back through Redis must not double-deliver.
        await waitFor(async () => b.received.length > 0)
        expect(a.received).toHaveLength(1)

        await a.bus.onApplicationShutdown()
        await b.bus.onApplicationShutdown()
    })

    it('keeps serving its own clients when Redis is unreachable', async () => {
        const client = new Redis(`redis://127.0.0.1:1`, {
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            retryStrategy: () => null,
            lazyConnect: true,
        })
        clients.push(client)
        client.on('error', () => undefined)

        const bus = new RedisRealtimeBus(client, silentLogger())
        const received: RealtimeMessage[] = []
        bus.messages$.subscribe((message) => received.push(message))
        bus.onModuleInit()

        bus.publish({ userId: 'coach-1', event: { type: 'athlete_linked' } })

        // The relay to the other instances fails (and is logged), but the coach
        // connected to *this* instance still gets his update.
        expect(received).toEqual([{ userId: 'coach-1', event: { type: 'athlete_linked' } }])
    })
})
