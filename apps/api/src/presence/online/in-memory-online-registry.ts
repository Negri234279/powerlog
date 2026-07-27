import { Injectable } from '@nestjs/common'

import { type ConnectResult, type DisconnectResult, OnlineRegistry } from './online-registry'

/**
 * Single-process online registry: a ref-count per user in a Map. Used when
 * `REDIS_URL` is unset (local dev, tests) and as the honest description of a
 * one-instance deployment.
 */
@Injectable()
export class InMemoryOnlineRegistry extends OnlineRegistry {
    private readonly counts = new Map<string, number>()

    async connect(userId: string): Promise<ConnectResult> {
        const next = (this.counts.get(userId) ?? 0) + 1
        this.counts.set(userId, next)

        return {
            firstConnection: next === 1,
        }
    }

    async disconnect(userId: string): Promise<DisconnectResult> {
        const next = (this.counts.get(userId) ?? 0) - 1
        if (next <= 0) this.counts.delete(userId)
        else this.counts.set(userId, next)

        return {
            lastDisconnection: next <= 0,
        }
    }

    async refresh(): Promise<void> {
        // Nothing to refresh in memory — the Map entry lives until disconnect.
    }

    async isOnline(userId: string): Promise<boolean> {
        return (this.counts.get(userId) ?? 0) > 0
    }

    async onlineAmong(userIds: string[]): Promise<Set<string>> {
        return new Set(userIds.filter((id) => (this.counts.get(id) ?? 0) > 0))
    }
}
