import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Gauge } from 'prom-client'
import { Resend } from 'resend'

import type { Env } from '../config/env'
import { METRIC } from '../observability/metrics'

/** Domain status is slow-moving; polling every 15 min is plenty. */
const PROBE_INTERVAL_MS = 15 * 60 * 1000

/** Minimal shape we read from `domains.list()` (decoupled from SDK types). */
interface ListedDomain {
    name: string
    status: string
}

/**
 * Polls the Resend API (via the API key) for the things the send path and the
 * delivery webhook can't see: whether the API key still works and whether the
 * sending domain is verified. Resend has no aggregate stats API, so this is the
 * only extra signal the key unlocks. Publishes `powerlog_resend_api_up` and
 * `powerlog_resend_domain_verified{domain}`. Only runs when MAIL_TRANSPORT=resend
 * (no-op on SMTP/dev). The interval is `unref`'d so it never blocks shutdown.
 */
@Injectable()
export class ResendDomainProbe implements OnApplicationBootstrap, OnModuleDestroy {
    private timer?: NodeJS.Timeout
    private client?: Resend

    constructor(
        private readonly config: ConfigService<Env, true>,
        @InjectMetric(METRIC.resendApiUp) private readonly apiUp: Gauge<string>,
        @InjectMetric(METRIC.resendDomainVerified) private readonly domainVerified: Gauge<string>,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(ResendDomainProbe.name)
    }

    onApplicationBootstrap(): void {
        if (this.config.get('MAIL_TRANSPORT', { infer: true }) !== 'resend') return

        this.client = new Resend(this.config.get('RESEND_API_KEY', { infer: true }))
        void this.probe()
        this.timer = setInterval(() => void this.probe(), PROBE_INTERVAL_MS)
        this.timer.unref()
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer)
    }

    private async probe(): Promise<void> {
        if (!this.client) return

        try {
            const { data, error } = await this.client.domains.list()
            if (error) throw new Error(error.message)

            this.apiUp.set(1)
            const domains = ((data as { data?: ListedDomain[] } | null)?.data ?? []) as ListedDomain[]
            for (const domain of domains) {
                this.domainVerified.set({ domain: domain.name }, domain.status === 'verified' ? 1 : 0)
            }
        } catch (error) {
            this.apiUp.set(0)
            this.logger.error({ err: error }, 'Resend domain probe failed')
        }
    }
}
