import { beforeEach, describe, expect, it, vi } from 'vitest'

import { silentLogger } from '../../tests/doubles/shared'
import type { EntitlementsSnapshot } from '../shared/contracts/entitlements'
import { EntitlementsCache } from './entitlements.cache'
import { InvalidateEntitlementsOnSubscriptionChanged } from './invalidate-on-subscription-changed.handler'
import { SubscriptionChangedIntegrationEvent } from '../shared/integration-events/subscription-changed.integration-event'

const FREE: EntitlementsSnapshot = {
    plan: 'athlete-free',
    audience: 'athlete',
    templates: true,
    mesocycles: true,
    ai: false,
    planSessions: false,
    maxAthletes: 0,
}

const PRO: EntitlementsSnapshot = { ...FREE, plan: 'athlete-pro', ai: true }

/**
 * The in-process mode (no `REDIS_URL`) — the one `pnpm dev` and the test suites
 * run in. The Redis-backed mode is the same code path with a client attached.
 */
describe('EntitlementsCache without Redis', () => {
    let cache: EntitlementsCache

    beforeEach(() => {
        cache = new EntitlementsCache(null, silentLogger())
    })

    it('serves what it was given', async () => {
        await cache.set('u-1', PRO)

        expect(await cache.get('u-1')).toEqual(PRO)
    })

    it('keeps users apart', async () => {
        await cache.set('u-1', PRO)

        expect(await cache.get('u-2')).toBeNull()
    })

    it('forgets a user the moment their subscription moves', async () => {
        // This is what lets the cache exist at all: someone who just paid must not
        // sit on the free plan staring at an upgrade button they already pressed.
        await cache.set('u-1', FREE)
        const handler = new InvalidateEntitlementsOnSubscriptionChanged(cache)

        await handler.handle(
            new SubscriptionChangedIntegrationEvent('u-1', 'sub-1', 'athlete-pro', 'activated', new Date()),
        )

        expect(await cache.get('u-1')).toBeNull()
    })

    it('expires on its own after a minute — nothing is cached forever', async () => {
        // Prod Redis runs `noeviction` (BullMQ cannot lose jobs), so anything cached
        // has to carry its own TTL or it never leaves.
        vi.useFakeTimers()
        try {
            await cache.set('u-1', PRO)
            vi.advanceTimersByTime(61_000)

            expect(await cache.get('u-1')).toBeNull()
        } finally {
            vi.useRealTimers()
        }
    })
})
