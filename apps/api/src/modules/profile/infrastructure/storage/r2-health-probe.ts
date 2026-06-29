import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Gauge } from 'prom-client'

import type { Env } from '../../../../config/env'
import { METRIC } from '../../../../observability/metrics'
import { AvatarStorage } from '../../application/ports/avatar-storage.port'

/** How often to probe the bucket. Cheap (a HeadBucket), so a tight-ish cadence
 *  gives a responsive UP/DOWN without meaningful cost. */
const PROBE_INTERVAL_MS = 30_000

/**
 * Periodically probes the R2 bucket with `HeadBucket` and publishes the result
 * as `powerlog_r2_up{bucket}` (1/0) plus the probe latency. Only runs when
 * AVATAR_STORAGE=r2 — on the filesystem backend it's a no-op (no series emitted).
 * The interval is `unref`'d so it never holds the process open at shutdown.
 */
@Injectable()
export class R2HealthProbe implements OnApplicationBootstrap, OnModuleDestroy {
    private timer?: NodeJS.Timeout
    private bucket = ''
    private lastUp: boolean | null = null

    constructor(
        private readonly config: ConfigService<Env, true>,
        private readonly storage: AvatarStorage,
        @InjectMetric(METRIC.r2Up) private readonly up: Gauge<string>,
        @InjectMetric(METRIC.r2ProbeDuration) private readonly probeDuration: Gauge<string>,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(R2HealthProbe.name)
    }

    onApplicationBootstrap(): void {
        if (this.config.get('AVATAR_STORAGE', { infer: true }) !== 'r2') return

        this.bucket = this.config.get('R2_BUCKET', { infer: true })
        void this.probe()
        this.timer = setInterval(() => void this.probe(), PROBE_INTERVAL_MS)
        this.timer.unref()
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer)
    }

    private async probe(): Promise<void> {
        const labels = { bucket: this.bucket }
        const start = performance.now()
        try {
            await this.storage.ping()
            this.up.set(labels, 1)
            if (this.lastUp === false) this.logger.info(labels, 'R2 bucket reachable again')
            this.lastUp = true
        } catch (error) {
            this.up.set(labels, 0)
            // Log only on the down transition so an outage isn't re-logged every tick.
            if (this.lastUp !== false) this.logger.error({ ...labels, err: error }, 'R2 bucket health probe failed')
            this.lastUp = false
        } finally {
            this.probeDuration.set(labels, (performance.now() - start) / 1000)
        }
    }
}
