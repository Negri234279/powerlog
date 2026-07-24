import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { SupportMetrics } from '../../application/ports/support-metrics.port'
import type { TicketCategory } from '../../domain/ticket-category'

/** Prometheus-backed SupportMetrics adapter. Counter declared in observability/metrics. */
@Injectable()
export class PrometheusSupportMetrics extends SupportMetrics {
    constructor(@InjectMetric(METRIC.supportTicketsOpened) private readonly ticketsOpened: Counter<string>) {
        super()
    }

    recordTicketOpened(category: TicketCategory): void {
        this.ticketsOpened.inc({ category })
    }
}
