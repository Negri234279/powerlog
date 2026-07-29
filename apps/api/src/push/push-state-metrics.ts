import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Gauge } from 'prom-client'

import { METRIC } from '../observability/metrics'
import { PushSubscriptionStore } from './push-subscription-store'

/** prom-client calls a metric's `collect` when the metric is read; @types omits it. */
type Sampled = Gauge<string> & { collect: () => Promise<void> }

/**
 * Samples the count of push subscriptions at scrape time, the same pattern the
 * coaching/billing state gauges use. Returns silently on a DB error so a database
 * hiccup keeps the last value instead of failing the whole `/metrics` scrape.
 */
@Injectable()
export class PushStateMetrics {
    constructor(
        private readonly store: PushSubscriptionStore,
        @InjectMetric(METRIC.pushSubscriptions) subscriptions: Gauge<string>,
    ) {
        ;(subscriptions as Sampled).collect = async () => {
            try {
                subscriptions.set(await this.store.count())
            } catch {
                // Keep the last value; DB problems are alerted on elsewhere.
            }
        }
    }
}
