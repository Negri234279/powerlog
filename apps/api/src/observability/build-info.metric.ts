import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Gauge } from 'prom-client'

import type { Env } from '../config/env'
import { APP_VERSION } from '../version'
import { METRIC } from './metrics'

/**
 * Sets `powerlog_build_info{version,service,environment} = 1` once at startup
 * (Prometheus build-info convention) so dashboards/alerts can pin which release
 * is running — the metrics counterpart of the OTel resource's `service.version`.
 */
@Injectable()
export class BuildInfoMetric {
    constructor(@InjectMetric(METRIC.buildInfo) gauge: Gauge<string>, config: ConfigService<Env, true>) {
        gauge.set(
            {
                version: APP_VERSION,
                service: config.get('OTEL_SERVICE_NAME', { infer: true }),
                environment: config.get('APP_ENV', { infer: true }),
            },
            1,
        )
    }
}
