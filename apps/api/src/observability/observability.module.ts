import { Global, Module, type OnApplicationShutdown } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'
import { register, Registry } from 'prom-client'

import { shutdownTelemetry } from '../tracing'
import { BuildInfoMetric } from './build-info.metric'
import { CqrsInstrumentation } from './cqrs-instrumentation'
import { GlobalExceptionFilter } from './global-exception.filter'
import { metricsProviders } from './metrics'
import { PgPoolMetrics } from './pg-pool-metrics'
import { RequestMetricsInterceptor } from './request-metrics.interceptor'

/**
 * Prometheus metrics at GET /metrics (default Node metrics + custom CQRS/HTTP
 * metrics) and the CQRS instrumentation (spans + metrics + logs per
 * command/query/event).
 *
 * Global so feature/shared modules can inject custom metrics (`@InjectMetric`)
 * without importing this module.
 */
@Global()
@Module({
    imports: [
        PrometheusModule.register({
            path: '/metrics',
            defaultMetrics: { enabled: true },
        }),
    ],
    providers: [
        ...metricsProviders,
        BuildInfoMetric,
        PgPoolMetrics,
        CqrsInstrumentation,
        { provide: APP_INTERCEPTOR, useClass: RequestMetricsInterceptor },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    ],
    // Metric providers are exported so the exception filter (Sub-block E) can
    // inject the domain-errors counter.
    exports: [...metricsProviders],
})
export class ObservabilityModule implements OnApplicationShutdown {
    constructor() {
        // Exemplars are only emitted in OpenMetrics exposition. Switch the default
        // registry (the one @willsoto's /metrics controller serves) so each
        // histogram bucket can carry a trace_id exemplar. Prometheus 3.x scrapes
        // OpenMetrics and, with --enable-feature=exemplar-storage, stores them.
        // register is typed to the Prometheus content type; cast to switch the
        // default registry's exposition (runtime supports it; types don't).
        const openMetrics = register as unknown as Registry<typeof Registry.OPENMETRICS_CONTENT_TYPE>
        openMetrics.setContentType(Registry.OPENMETRICS_CONTENT_TYPE)
    }

    // Flush + shut down the OpenTelemetry SDK last in the shutdown sequence
    // (after the HTTP server drains and the DB pool closes), letting its timers
    // clear so the process exits on its own.
    async onApplicationShutdown(): Promise<void> {
        await shutdownTelemetry()
    }
}
