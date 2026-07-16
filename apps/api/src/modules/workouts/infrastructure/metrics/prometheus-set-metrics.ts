import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { SetMetrics } from '../../application/ports/set-metrics.port'
import type { SetOutcome } from '../../domain/set-outcome'

/** Prometheus-backed SetMetrics adapter. Counter declared in observability/metrics. */
@Injectable()
export class PrometheusSetMetrics extends SetMetrics {
    constructor(@InjectMetric(METRIC.setsCompleted) private readonly completed: Counter<string>) {
        super()
    }

    recordCompleted(outcome: SetOutcome): void {
        this.completed.inc({ outcome })
    }
}
