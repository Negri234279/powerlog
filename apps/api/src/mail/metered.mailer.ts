import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Counter, Histogram } from 'prom-client'

import { METRIC } from '../observability/metrics'
import { type EmailMessage, Mailer } from './mailer.port'

/**
 * Decorates the real `Mailer` transport with the send-side observability: counts
 * dispatches by purpose (`message.tag`) and outcome, times the transport call
 * into a latency histogram, and emits a PII-free log line per send (type +
 * status + ms — never the recipient or subject) so an email feed shows up in
 * Loki/Grafana. Failures are counted, logged, and re-thrown so callers keep
 * their error handling. Wrapping the transport covers every email in one place.
 */
@Injectable()
export class MeteredMailer extends Mailer {
    constructor(
        private readonly inner: Mailer,
        @InjectMetric(METRIC.emailsSent) private readonly emailsSent: Counter<string>,
        @InjectMetric(METRIC.emailSendDuration) private readonly sendDuration: Histogram<string>,
        private readonly logger?: PinoLogger,
    ) {
        super()
        this.logger?.setContext(MeteredMailer.name)
    }

    async send(message: EmailMessage): Promise<string | undefined> {
        const type = message.tag ?? 'unknown'
        const startedAt = Date.now()
        const end = this.sendDuration.startTimer({ type })

        try {
            const messageId = await this.inner.send(message)

            this.emailsSent.inc({ type, status: 'sent' })
            end({ status: 'sent' })
            this.logger?.info({ type, status: 'sent', ms: Date.now() - startedAt, messageId }, 'email dispatched')

            return messageId
        } catch (error) {
            this.emailsSent.inc({ type, status: 'failed' })
            end({ status: 'failed' })
            this.logger?.error({ type, status: 'failed', err: error }, 'email send failed')
            throw error
        }
    }
}
