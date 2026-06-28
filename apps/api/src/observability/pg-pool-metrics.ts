import { Inject, Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { Pool } from 'pg'
import type { Gauge } from 'prom-client'

import { PG_POOL } from '../database/database.module'
import { METRIC } from './metrics'

/**
 * Exposes the pg connection pool's live state as gauges, sampled at scrape time
 * via the gauge's `collect` callback (no background timer). `waiting > 0` means
 * the app is queuing for a connection — the pool-saturation signal the
 * server-side postgres-exporter can't see.
 */
@Injectable()
export class PgPoolMetrics {
    constructor(
        @Inject(PG_POOL) pool: Pool,
        @InjectMetric(METRIC.pgPoolConnections) connections: Gauge<string>,
        @InjectMetric(METRIC.pgPoolMax) max: Gauge<string>,
    ) {
        // Configured ceiling (pg defaults to 10) — static, set once.
        max.set(pool.options.max ?? 10)

        // Sampled on every /metrics scrape: prom-client calls a metric's `collect`
        // from get() at scrape time, but @types omits it on the instance.
        const sampled = connections as Gauge<string> & { collect: () => void }
        sampled.collect = () => {
            connections.set({ state: 'total' }, pool.totalCount)
            connections.set({ state: 'idle' }, pool.idleCount)
            connections.set({ state: 'waiting' }, pool.waitingCount)
        }
    }
}
