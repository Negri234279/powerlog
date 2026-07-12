import type { Observable } from 'rxjs'

import type { RealtimeEvent } from './realtime-event'

/** An event addressed to one user. */
export interface RealtimeMessage {
    userId: string
    event: RealtimeEvent
}

/**
 * How a published event reaches the API processes holding the SSE connections.
 *
 * With one instance that's just an in-process Subject; with several it has to
 * cross the process boundary, because the coach's browser may well be connected
 * to a different replica than the one handling the athlete's mutation. The two
 * adapters (`InMemoryRealtimeBus`, `RedisRealtimeBus`) are picked by whether
 * `REDIS_URL` is set — nothing else in `src/realtime` knows the difference.
 */
export abstract class RealtimeBus {
    /** Every message this process should deliver, its own publishes included. */
    abstract readonly messages$: Observable<RealtimeMessage>

    /** Fire and forget: delivery is best-effort by design. */
    abstract publish(message: RealtimeMessage): void
}
