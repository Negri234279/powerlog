import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Gauge } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import {
    type AdminBillingStats,
    AdminBillingStatsReadModel,
} from '../../application/ports/admin-billing-stats.read-model'

/** prom-client calls a metric's `collect` when the metric is read; @types omits it. */
type Sampled = Gauge<string> & { collect: () => Promise<void> }

/**
 * Where the business currently stands, as gauges sampled at scrape time: how many
 * subscriptions and where they are billed, which plans of the catalog actually
 * sell, the MRR they add up to, and the churn that is **already decided but not
 * yet visible** (cancelled, still inside the period they paid for).
 *
 * Reuses the read model behind the admin panel — no second SQL, and the numbers in
 * Grafana cannot drift from the ones an admin is looking at.
 */
@Injectable()
export class BillingStateMetrics {
    constructor(
        private readonly stats: AdminBillingStatsReadModel,
        @InjectMetric(METRIC.subscriptions) private readonly subscriptions: Gauge<string>,
        @InjectMetric(METRIC.subscriptionsByPlan) private readonly byPlan: Gauge<string>,
        @InjectMetric(METRIC.mrrCents) private readonly mrr: Gauge<string>,
        @InjectMetric(METRIC.subscriptionsCanceling) private readonly canceling: Gauge<string>,
    ) {
        const sample = (gauge: Gauge<string>, apply: (snapshot: AdminBillingStats) => void): void => {
            ;(gauge as Sampled).collect = async () => {
                const snapshot = await this.snapshot()
                if (snapshot) apply(snapshot)
            }
        }

        // `reset()` before re-setting: a plan (or a status/gateway combo) that drops
        // to zero subscriptions has no row in the query any more, and without this it
        // would keep reporting its last value forever.
        sample(this.subscriptions, (snapshot) => {
            this.subscriptions.reset()
            for (const row of snapshot.byStatus) {
                this.subscriptions.set({ status: row.status, gateway: row.gateway }, row.count)
            }
        })

        sample(this.byPlan, (snapshot) => {
            this.byPlan.reset()
            for (const row of snapshot.byPlan) {
                this.byPlan.set({ plan: row.plan, audience: row.audience }, row.count)
            }
        })

        sample(this.mrr, (snapshot) => {
            this.mrr.reset()
            for (const row of snapshot.mrr) {
                this.mrr.set({ plan: row.plan, currency: row.currency }, row.amountCents)
            }
        })

        sample(this.canceling, (snapshot) => this.canceling.set(snapshot.canceling))
    }

    private cached: { at: number; stats: AdminBillingStats } | null = null
    private inFlight: Promise<AdminBillingStats> | null = null

    /**
     * One read per scrape, not four: the gauges are collected concurrently, so they
     * share the in-flight query and a short cache (well under the 15s scrape
     * interval, so a scrape never serves the previous one's numbers).
     *
     * Null if the DB is unreachable — the gauges then keep their last value rather
     * than failing the whole /metrics scrape over a database problem that is
     * already alerted on elsewhere.
     */
    private async snapshot(): Promise<AdminBillingStats | null> {
        const now = Date.now()
        if (this.cached && now - this.cached.at < 5_000) return this.cached.stats

        this.inFlight ??= this.stats
            .read()
            .then((stats) => {
                this.cached = { at: Date.now(), stats }

                return stats
            })
            .finally(() => {
                this.inFlight = null
            })

        try {
            return await this.inFlight
        } catch {
            return null
        }
    }
}
