import type { Redis } from 'ioredis'

import { type ConnectResult, type DisconnectResult, OnlineRegistry } from './online-registry'

/**
 * Cross-instance online registry: a per-user counter in Redis, so "online in ANY
 * process" is a single key. Used when `REDIS_URL` is set. The counter carries a
 * TTL refreshed on connect and by the gateway's heartbeat (Chat.2b) so a process
 * that dies without decrementing can't pin a user "online" forever — the key
 * simply expires. Redis runs `noeviction` in prod, hence the explicit TTL.
 */
export class RedisOnlineRegistry extends OnlineRegistry {
    /** A still-connected socket must be refreshed before this elapses. */
    private static readonly TTL_SECONDS = 90

    constructor(private readonly redis: Redis) {
        super()
    }

    async connect(userId: string): Promise<ConnectResult> {
        const key = this.key(userId)
        const count = await this.redis.incr(key)

        await this.redis.expire(key, RedisOnlineRegistry.TTL_SECONDS)

        return {
            firstConnection: count === 1,
        }
    }

    async disconnect(userId: string): Promise<DisconnectResult> {
        const key = this.key(userId)
        const count = await this.redis.decr(key)

        if (count <= 0) {
            await this.redis.del(key)
        } else {
            await this.redis.expire(key, RedisOnlineRegistry.TTL_SECONDS)
        }

        return {
            lastDisconnection: count <= 0,
        }
    }

    async refresh(userId: string): Promise<void> {
        await this.redis.expire(this.key(userId), RedisOnlineRegistry.TTL_SECONDS)
    }

    async isOnline(userId: string): Promise<boolean> {
        const value = await this.redis.get(this.key(userId))
        return value !== null && Number(value) > 0
    }

    async onlineAmong(userIds: string[]): Promise<Set<string>> {
        if (userIds.length === 0) return new Set()

        const values = await this.redis.mget(userIds.map((id) => this.key(id)))
        return new Set(userIds.filter((_, i) => values[i] !== null && Number(values[i]) > 0))
    }

    private key(userId: string): string {
        return `presence:count:${userId}`
    }
}
