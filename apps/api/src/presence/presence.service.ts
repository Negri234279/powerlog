import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

import { CoachLinks } from '../shared/contracts/coach-links'
import { Clock } from './clock'
import { OnlineRegistry } from './online/online-registry'
import { PresenceBroadcaster } from './presence-broadcaster'
import { PresenceStore } from './presence-store'

/**
 * The presence lifecycle, driven by the realtime socket (Chat.2b calls
 * `onConnect`/`onDisconnect`). Ref-counts live connections per user via the
 * `OnlineRegistry`, and on the online↔offline transitions fans a `presence:update`
 * out to that user's counterparties only (never a global broadcast).
 *
 * Going offline waits a short grace period before it's believed, so a page
 * refresh or a brief reconnect doesn't flicker the dot — if the user is back by
 * the time it fires, the offline is simply dropped. `lastSeenAt` is persisted
 * durably at that point so the admin panel has a real value.
 */
@Injectable()
export class PresenceService implements OnModuleDestroy {
    /** Don't believe an offline until the user has stayed gone this long. */
    private static readonly OFFLINE_GRACE_MS = 12_000

    private readonly offlineTimers = new Map<string, NodeJS.Timeout>()

    constructor(
        private readonly online: OnlineRegistry,
        private readonly store: PresenceStore,
        private readonly coachLinks: CoachLinks,
        private readonly broadcaster: PresenceBroadcaster,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(PresenceService.name)
    }

    /** A socket for `userId` connected. Emits `online` on the first connection. */
    async onConnect(userId: string): Promise<void> {
        // A reconnect within the grace window cancels the pending offline.
        this.clearOfflineTimer(userId)

        const { firstConnection } = await this.online.connect(userId)
        if (!firstConnection) return

        this.logger.debug({ userId }, 'presence online')
        await this.broadcast(userId, { online: true, lastSeenAt: null })
    }

    /**
     * A socket for `userId` disconnected. On the last connection, schedules the
     * offline transition after the grace period.
     */
    async onDisconnect(userId: string): Promise<void> {
        const { lastDisconnection } = await this.online.disconnect(userId)
        if (!lastDisconnection) return

        this.clearOfflineTimer(userId)
        const timer = setTimeout(() => {
            void this.finalizeOffline(userId)
        }, PresenceService.OFFLINE_GRACE_MS)
        // Don't keep the event loop (or the shutdown drain) alive for a timer.
        timer.unref?.()
        this.offlineTimers.set(userId, timer)
    }

    /** Keep a still-connected user's liveness fresh (gateway heartbeat, Chat.2b). */
    async refresh(userId: string): Promise<void> {
        await this.online.refresh(userId)
    }

    onModuleDestroy(): void {
        for (const timer of this.offlineTimers.values()) clearTimeout(timer)
        this.offlineTimers.clear()
    }

    private async finalizeOffline(userId: string): Promise<void> {
        this.offlineTimers.delete(userId)
        // A reconnect during the grace window wins — they're online again.
        if (await this.online.isOnline(userId)) return

        const at = this.clock.now()
        await this.store.touch(userId, at)
        this.logger.debug({ userId }, 'presence offline')
        await this.broadcast(userId, { online: false, lastSeenAt: at })
    }

    private async broadcast(userId: string, state: { online: boolean; lastSeenAt: Date | null }): Promise<void> {
        const recipients = await this.coachLinks.counterpartyIdsOf(userId)
        if (recipients.length === 0) return

        await this.broadcaster.emit(recipients, { userId, ...state })
    }

    private clearOfflineTimer(userId: string): void {
        const timer = this.offlineTimers.get(userId)
        if (timer) {
            clearTimeout(timer)
            this.offlineTimers.delete(userId)
        }
    }
}
