import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeClock, FakePresenceBroadcaster, InMemoryPresenceStore } from '../../tests/doubles/presence'
import { FakeCoachLinks } from '../../tests/doubles/shared/fake-coach-links'
import { silentLogger } from '../../tests/doubles/shared/silent-logger'
import { gaugeValue, testGauge } from '../../tests/doubles/shared/test-gauge'
import { InMemoryOnlineRegistry } from './online/in-memory-online-registry'
import { PresenceService } from './presence.service'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const GRACE_MS = 12_000

describe('PresenceService', () => {
    let registry: InMemoryOnlineRegistry
    let store: InMemoryPresenceStore
    let coachLinks: FakeCoachLinks
    let broadcaster: FakePresenceBroadcaster
    let clock: FakeClock
    let onlineUsers: ReturnType<typeof testGauge>
    let service: PresenceService

    beforeEach(() => {
        vi.useFakeTimers()
        registry = new InMemoryOnlineRegistry()
        store = new InMemoryPresenceStore()
        coachLinks = new FakeCoachLinks().link(COACH, ATHLETE)
        broadcaster = new FakePresenceBroadcaster()
        clock = new FakeClock(new Date('2026-05-01T10:00:00.000Z'))
        onlineUsers = testGauge()
        service = new PresenceService(registry, store, coachLinks, broadcaster, clock, silentLogger(), onlineUsers)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('emits online to the user’s counterparties on the first connection', async () => {
        await service.onConnect(ATHLETE)

        expect(broadcaster.updatesWhere(true)).toHaveLength(1)
        expect(broadcaster.emitted[0]).toMatchObject({
            recipientIds: [COACH],
            update: { userId: ATHLETE, online: true, lastSeenAt: null },
        })
    })

    it('tracks the online-users gauge on the first/last connection only', async () => {
        await service.onConnect(ATHLETE)
        await service.onConnect(ATHLETE) // second socket — no change
        expect(await gaugeValue(onlineUsers)).toBe(1)

        await service.onDisconnect(ATHLETE) // one socket left — still online
        expect(await gaugeValue(onlineUsers)).toBe(1)

        await service.onDisconnect(ATHLETE) // last socket — offline
        expect(await gaugeValue(onlineUsers)).toBe(0)
    })

    it('does not re-emit online for a second socket of the same user', async () => {
        await service.onConnect(ATHLETE)
        await service.onConnect(ATHLETE)

        expect(broadcaster.updatesWhere(true)).toHaveLength(1)
    })

    it('tracks online without broadcasting when the user has no counterparties', async () => {
        await service.onConnect('lonely')

        expect(broadcaster.emitted).toHaveLength(0)
        expect(await registry.isOnline('lonely')).toBe(true)
    })

    it('emits offline and persists last-seen only after the grace period', async () => {
        await service.onConnect(ATHLETE)
        await service.onDisconnect(ATHLETE)

        // Nothing yet — the offline is on a grace timer.
        expect(broadcaster.updatesWhere(false)).toHaveLength(0)

        await vi.advanceTimersByTimeAsync(GRACE_MS)

        const offline = broadcaster.updatesWhere(false)
        expect(offline).toHaveLength(1)
        expect(offline[0]).toMatchObject({
            recipientIds: [COACH],
            update: { userId: ATHLETE, online: false, lastSeenAt: new Date('2026-05-01T10:00:00.000Z') },
        })
        expect(store.seen.get(ATHLETE)).toEqual(new Date('2026-05-01T10:00:00.000Z'))
    })

    it('cancels the pending offline when the user reconnects within the grace window', async () => {
        await service.onConnect(ATHLETE)
        await service.onDisconnect(ATHLETE)
        await vi.advanceTimersByTimeAsync(GRACE_MS / 2)

        await service.onConnect(ATHLETE)
        await vi.advanceTimersByTimeAsync(GRACE_MS)

        // Never appeared offline to counterparties, and no last-seen was written.
        expect(broadcaster.updatesWhere(false)).toHaveLength(0)
        expect(store.seen.has(ATHLETE)).toBe(false)
        expect(await registry.isOnline(ATHLETE)).toBe(true)
    })

    it('does not emit offline while another socket keeps the user online', async () => {
        await service.onConnect(ATHLETE)
        await service.onConnect(ATHLETE)

        await service.onDisconnect(ATHLETE)
        await vi.advanceTimersByTimeAsync(GRACE_MS)

        expect(broadcaster.updatesWhere(false)).toHaveLength(0)
    })
})
