import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Gauge } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import {
    type AdminCoachingStats,
    AdminCoachingStatsReadModel,
} from '../../application/ports/admin-coaching-stats.read-model'

/** prom-client calls a metric's `collect` when the metric is read; @types omits it. */
type Sampled = Gauge<string> & { collect: () => Promise<void> }

/**
 * The current shape of the coaching graph (links, active coaches/athletes, the
 * pending-invitation backlog) as gauges, sampled at scrape time — the counters
 * tell you what *moved*, these tell you where things *are*.
 *
 * Reuses the read model already backing the admin dashboard: no new SQL, and the
 * numbers on the dashboard and in Grafana can't drift apart.
 */
@Injectable()
export class CoachingStateMetrics {
    constructor(
        private readonly stats: AdminCoachingStatsReadModel,
        @InjectMetric(METRIC.coachingLinks) links: Gauge<string>,
        @InjectMetric(METRIC.coachingCoaches) coaches: Gauge<string>,
        @InjectMetric(METRIC.coachingAthletes) athletes: Gauge<string>,
        @InjectMetric(METRIC.coachingPendingInvitations) pending: Gauge<string>,
    ) {
        const sample = (gauge: Gauge<string>, pick: (stats: AdminCoachingStats) => number): void => {
            ;(gauge as Sampled).collect = async () => {
                const snapshot = await this.snapshot()
                if (snapshot) gauge.set(pick(snapshot))
            }
        }

        sample(links, (s) => s.links)
        sample(coaches, (s) => s.activeCoaches)
        sample(athletes, (s) => s.linkedAthletes)
        sample(pending, (s) => s.pendingInvitations)
    }

    private cached: { at: number; stats: AdminCoachingStats } | null = null
    private inFlight: Promise<AdminCoachingStats> | null = null

    /**
     * One read per scrape, not four: the four gauges are collected concurrently,
     * so they share the in-flight query and a short-lived cache (well under the
     * 15s scrape interval, so a scrape never serves the previous one's numbers).
     *
     * Returns null if the DB is unreachable — the gauges then keep their last
     * value instead of failing the whole /metrics scrape (which would blind every
     * other metric over a database problem that is already alerted on elsewhere).
     */
    private async snapshot(): Promise<AdminCoachingStats | null> {
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
