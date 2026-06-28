import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../observability/metrics'
import { type EmailMessage, Mailer } from './mailer.port'

/**
 * Decorates the real `Mailer` transport with the `emails_sent` business metric,
 * counting every dispatch by purpose (`message.tag`) and outcome. Failures are
 * counted and re-thrown so callers keep their existing error handling. Wrapping
 * the transport keeps prom-client out of the feature services and covers every
 * email (current and future) in one place.
 */
@Injectable()
export class MeteredMailer extends Mailer {
    constructor(
        private readonly inner: Mailer,
        @InjectMetric(METRIC.emailsSent) private readonly emailsSent: Counter<string>,
    ) {
        super()
    }

    async send(message: EmailMessage): Promise<void> {
        const type = message.tag ?? 'unknown'

        try {
            await this.inner.send(message)

            this.emailsSent.inc({ type, status: 'sent' })
        } catch (error) {
            this.emailsSent.inc({ type, status: 'failed' })
            throw error
        }
    }
}
