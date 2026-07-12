import { Injectable, type MessageEvent, type OnApplicationShutdown } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter, Gauge } from 'prom-client'
import { defer, filter, finalize, interval, map, merge, Observable, Subject, takeUntil } from 'rxjs'

import { METRIC } from '../observability/metrics'
import { RealtimeBus } from './realtime.bus'
import { HEARTBEAT, type RealtimeEvent } from './realtime-event'

/** Idle-connection reapers (proxies, load balancers) usually sit at 30–60s. */
const HEARTBEAT_MS = 25_000

/**
 * The bridge between the domain and the connected browsers: integration-event
 * handlers `publish()`, the SSE controller hands each request a `streamFor()`.
 *
 * How a published event reaches the other API processes is the `RealtimeBus`'s
 * problem (in-process, or Redis pub/sub when `REDIS_URL` is set) — the hub only
 * owns the per-connection concerns: filtering by user, heartbeats, metrics, and
 * ending the streams cleanly on shutdown.
 */
@Injectable()
export class RealtimeHub implements OnApplicationShutdown {
    private readonly shutdown = new Subject<void>()

    constructor(
        private readonly bus: RealtimeBus,
        @InjectMetric(METRIC.realtimeConnections) private readonly connections: Gauge<string>,
        @InjectMetric(METRIC.realtimeEvents) private readonly published: Counter<string>,
    ) {}

    /** Push an event to those users' open streams. Users with no stream connected
     *  (the common case — nobody is required to be online) simply drop it. */
    publish(userIds: readonly string[], event: RealtimeEvent): void {
        for (const userId of userIds) {
            this.bus.publish({ userId, event })
        }

        this.published.inc({ type: event.type }, userIds.length)
    }

    /** One user's live stream: their events, plus a heartbeat while idle. */
    streamFor(userId: string): Observable<MessageEvent> {
        return defer(() => {
            this.connections.inc()

            const mine = this.bus.messages$.pipe(
                filter((message) => message.userId === userId),
                map((message) => message.event),
            )
            const heartbeats = interval(HEARTBEAT_MS).pipe(map(() => HEARTBEAT))

            return merge(mine, heartbeats)
        }).pipe(
            map((data): MessageEvent => ({ data })),
            takeUntil(this.shutdown),
            finalize(() => this.connections.dec()),
        )
    }

    /**
     * An open SSE response is an in-flight request that never ends on its own, so
     * without this the graceful drain (`server.close()`) would block on every
     * connected client until the watchdog force-closes the sockets. Completing the
     * streams ends the responses and lets the drain finish normally.
     */
    onApplicationShutdown(): void {
        this.shutdown.next()
        this.shutdown.complete()
    }
}
