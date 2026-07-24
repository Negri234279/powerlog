import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter, Histogram } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { AiGenerationMetrics } from '../../application/ports/ai-generation-metrics.port'

/** Prometheus-backed AiGenerationMetrics adapter. Metrics declared in observability/metrics. */
@Injectable()
export class PrometheusAiGenerationMetrics extends AiGenerationMetrics {
    constructor(
        @InjectMetric(METRIC.aiGenerationsQueued) private readonly queued: Counter<string>,
        @InjectMetric(METRIC.aiGenerationDuration) private readonly duration: Histogram<string>,
    ) {
        super()
    }

    recordQueued(kind: string): void {
        this.queued.inc({ kind })
    }

    recordSettled(kind: string, status: string, durationSeconds: number): void {
        this.duration.observe({ kind, status }, durationSeconds)
    }
}
