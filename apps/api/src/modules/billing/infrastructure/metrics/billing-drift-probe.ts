import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Gauge } from 'prom-client'

import { isTest } from '../../../../config/env'
import { METRIC } from '../../../../observability/metrics'
import { ReconcileSubscriptions } from '../../application/services/reconcile-subscriptions.service'

/**
 * Hourly. The comparison costs a handful of API calls and the thing it catches —
 * a webhook that never arrived — is measured in weeks of wrong billing, so a tight
 * cadence buys nothing and a daily one is too slow to matter.
 */
const INTERVAL_MS = 60 * 60 * 1000

/** A minute after boot: let the app settle, but do not wait an hour for the first answer. */
const FIRST_RUN_MS = 60_000

/**
 * Runs the reconciliation on a timer and publishes `powerlog_billing_drift{gateway}`
 * — **a number that should always be zero, which is what makes it the cheapest
 * alert in the system**.
 *
 * A gateway that could not be asked leaves its gauge untouched rather than
 * reporting a fabricated zero: silence is not the same as agreement, and a lie
 * that silences an alert is worse than no alert.
 *
 * A simple interval, like the R2 and Resend probes — BullMQ is not here yet and
 * this does not need it. The timer is `unref`'d so it never holds shutdown open.
 */
@Injectable()
export class BillingDriftProbe implements OnApplicationBootstrap, OnModuleDestroy {
    private timer?: NodeJS.Timeout
    private firstRun?: NodeJS.Timeout

    constructor(
        private readonly reconcile: ReconcileSubscriptions,
        @InjectMetric(METRIC.billingDrift) private readonly drift: Gauge<string>,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(BillingDriftProbe.name)
    }

    onApplicationBootstrap(): void {
        // The test suites boot the whole app; a timer calling out to a gateway there
        // would be noise at best.
        if (isTest) return

        this.firstRun = setTimeout(() => void this.run(), FIRST_RUN_MS)
        this.firstRun.unref()
        this.timer = setInterval(() => void this.run(), INTERVAL_MS)
        this.timer.unref()
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer)
        if (this.firstRun) clearTimeout(this.firstRun)
    }

    private async run(): Promise<void> {
        try {
            for (const result of await this.reconcile.run()) {
                // null = the provider did not answer. Leave the gauge as it was.
                if (result.total === null) continue

                this.drift.set({ gateway: result.gateway }, result.total)
            }
        } catch (error) {
            // A reconciliation that fails is a monitoring problem, not a billing one:
            // it must never take the app down with it.
            this.logger.error({ err: error }, 'billing reconciliation failed')
        }
    }
}
