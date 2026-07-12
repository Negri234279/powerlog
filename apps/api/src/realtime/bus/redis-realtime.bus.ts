import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common'
import type { Redis } from 'ioredis'
import type { PinoLogger } from 'nestjs-pino'
import { randomUUID } from 'node:crypto'
import { Observable, Subject } from 'rxjs'

import { REALTIME_EVENT_TYPES, type RealtimeEventType } from '../realtime-event'
import { RealtimeBus, type RealtimeMessage } from '../realtime.bus'

/** Exported so tests can drive the channel without hard-coding the name. */
export const REALTIME_CHANNEL = 'powerlog:realtime'

/** What goes on the wire between instances. `origin` is how a process recognises
 *  its own publishes coming back (it already delivered them locally). */
interface Envelope extends RealtimeMessage {
    origin: string
}

function parse(raw: string): Envelope | null {
    try {
        const value = JSON.parse(raw) as Partial<Envelope>
        const type = value.event?.type

        // Guard the boundary: a rolling deploy means an older instance can receive
        // an event type it doesn't know yet. Drop it rather than push it blindly.
        if (typeof value.origin !== 'string' || typeof value.userId !== 'string') return null
        if (!REALTIME_EVENT_TYPES.includes(type as RealtimeEventType)) return null

        return {
            origin: value.origin,
            userId: value.userId,
            event: {
                type: type as RealtimeEventType,
            },
        }
    } catch {
        return null
    }
}

/**
 * Cross-instance fan-out over Redis pub/sub, so a coach connected to replica A
 * hears about a mutation served by replica B.
 *
 * Delivery is **local-first**: a publish is handed to this process's own streams
 * immediately and only then relayed to Redis, so the clients on the instance that
 * served the mutation are updated even while Redis is unreachable — the failure
 * mode degrades to "the other replicas' clients wait for their next refetch"
 * instead of "nobody gets anything". The `origin` stamp is what stops the
 * publisher from delivering its own message twice when it comes back around.
 */
@Injectable()
export class RedisRealtimeBus extends RealtimeBus implements OnModuleInit, OnApplicationShutdown {
    private readonly origin = randomUUID()
    private readonly subject = new Subject<RealtimeMessage>()
    private readonly subscriber: Redis

    readonly messages$: Observable<RealtimeMessage> = this.subject.asObservable()

    constructor(
        private readonly redis: Redis,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(RedisRealtimeBus.name)
        // A connection in subscriber mode can't run other commands, so pub/sub
        // needs its own — duplicated from the shared client to inherit its options.
        this.subscriber = redis.duplicate()
    }

    onModuleInit(): void {
        this.subscriber.on('message', (_channel: string, raw: string) => {
            const envelope = parse(raw)
            if (!envelope || envelope.origin === this.origin) return

            this.subject.next({ userId: envelope.userId, event: envelope.event })
        })

        // On every (re)connection, not just the first: if Redis was down at boot
        // there is no subscription for ioredis to restore by itself.
        this.subscriber.on('ready', () => {
            this.subscriber.subscribe(REALTIME_CHANNEL).catch((err: unknown) => {
                this.logger.error({ err }, 'failed to subscribe to the realtime channel')
            })
        })
    }

    publish(message: RealtimeMessage): void {
        this.subject.next(message)

        const envelope: Envelope = { ...message, origin: this.origin }
        this.redis.publish(REALTIME_CHANNEL, JSON.stringify(envelope)).catch((err: unknown) => {
            // The local clients already have it; the other instances' clients will
            // see it on their next refetch.
            this.logger.warn({ err, type: message.event.type }, 'realtime event not relayed to Redis')
        })
    }

    async onApplicationShutdown(): Promise<void> {
        this.subject.complete()
        await this.subscriber.quit()
    }
}
