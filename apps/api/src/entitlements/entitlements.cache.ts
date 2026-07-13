import { Inject, Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

import { REDIS, type RedisClient } from '../redis/redis.module'
import type { EntitlementsSnapshot } from '../shared/contracts/entitlements'

/** Short enough that a stale answer is a blip, long enough to matter on a page load. */
const TTL_SECONDS = 60

const keyOf = (userId: string): string => `pl:ent:${userId}`

/**
 * Caches the answer to "what may this user do".
 *
 * It is worth caching because the web asks on **every page load** (`myEntitlements`)
 * and every gated write asks again. It is safe to cache because the answer is
 * invalidated the moment anything moves it: a subscription change publishes an
 * integration event, and the handler drops the key.
 *
 * Two properties that are deliberate:
 *  - **The TTL is on the key itself**, not left to eviction. Prod Redis runs
 *    `noeviction` (BullMQ cannot have jobs evicted), so anything cached has to
 *    expire by itself or it never leaves.
 *  - **Redis is optional.** With no `REDIS_URL` this falls back to an in-process
 *    Map — the same mode `pnpm dev` and the test suites run in. The fallback is
 *    per-instance, which is fine: the TTL is 60s and the invalidation event reaches
 *    every replica through the bus anyway.
 *
 * A Redis that is down degrades to "no cache", never to a wrong answer: every read
 * and write is wrapped, and a failure just means we ask billing again.
 */
@Injectable()
export class EntitlementsCache {
    private readonly local = new Map<string, { snapshot: EntitlementsSnapshot; expiresAt: number }>()

    constructor(
        @Inject(REDIS) private readonly redis: RedisClient,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(EntitlementsCache.name)
    }

    async get(userId: string): Promise<EntitlementsSnapshot | null> {
        if (!this.redis) return this.getLocal(userId)

        try {
            const cached = await this.redis.get(keyOf(userId))

            return cached ? (JSON.parse(cached) as EntitlementsSnapshot) : null
        } catch (error) {
            // A cache that is unreachable is a slow app, not a wrong one.
            this.logger.warn({ err: error }, 'entitlements cache read failed')

            return null
        }
    }

    async set(userId: string, snapshot: EntitlementsSnapshot): Promise<void> {
        if (!this.redis) {
            this.local.set(userId, { snapshot, expiresAt: Date.now() + TTL_SECONDS * 1000 })

            return
        }

        try {
            await this.redis.set(keyOf(userId), JSON.stringify(snapshot), 'EX', TTL_SECONDS)
        } catch (error) {
            this.logger.warn({ err: error }, 'entitlements cache write failed')
        }
    }

    /**
     * Forget **everyone**. Called when the catalog itself changes: editing a plan's
     * entitlements is retroactive by design ("grant AI to Pro" must reach its
     * subscribers at once), and a per-user invalidation cannot express that — we do
     * not know who is on the plan without asking, and the answer is exactly what is
     * cached.
     *
     * An admin action, so a flush is cheap. Redis is shared, so every replica loses
     * it together; the in-process fallback only matters when there is one instance
     * anyway.
     */
    async invalidateAll(): Promise<void> {
        this.local.clear()
        if (!this.redis) return

        try {
            const keys = await this.redis.keys(keyOf('*'))
            if (keys.length > 0) await this.redis.del(...keys)
        } catch (error) {
            // Bounded by the TTL: the worst case is a minute of stale entitlements.
            this.logger.warn({ err: error }, 'entitlements cache flush failed')
        }
    }

    /** Forget this user. Called the moment their subscription moves. */
    async invalidate(userId: string): Promise<void> {
        this.local.delete(userId)
        if (!this.redis) return

        try {
            await this.redis.del(keyOf(userId))
        } catch (error) {
            // The TTL still bounds how wrong we can be (60s), so this is a warning,
            // not a failure worth propagating to the user who just paid.
            this.logger.warn({ err: error }, 'entitlements cache invalidation failed')
        }
    }

    private getLocal(userId: string): EntitlementsSnapshot | null {
        const hit = this.local.get(userId)
        if (!hit) return null

        if (hit.expiresAt <= Date.now()) {
            this.local.delete(userId)

            return null
        }

        return hit.snapshot
    }
}
