import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { MesocycleMetrics } from '../../application/ports/mesocycle-metrics.port'
import type { MesocycleGenerationMode } from '../../application/ports/mesocycle-metrics.port'
import type { MesocycleStatus } from '../../domain/mesocycle-status'

/** Prometheus-backed MesocycleMetrics adapter. Counters declared in observability/metrics. */
@Injectable()
export class PrometheusMesocycleMetrics extends MesocycleMetrics {
    constructor(
        @InjectMetric(METRIC.mesocycleStatusTransitions) private readonly transitions: Counter<string>,
        @InjectMetric(METRIC.mesocycleSessionsGenerated) private readonly generated: Counter<string>,
    ) {
        super()
    }

    recordStatusTransition(status: MesocycleStatus): void {
        this.transitions.inc({ status })
    }

    recordSessionsGenerated(mode: MesocycleGenerationMode, sessions: number): void {
        this.generated.inc({ mode }, sessions)
    }
}
