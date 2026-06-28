import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common'
import { type GqlContextType, GqlExecutionContext } from '@nestjs/graphql'
import { trace } from '@opentelemetry/api'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Histogram } from 'prom-client'
import { type Observable, tap } from 'rxjs'

import { METRIC } from './metrics'

interface Described {
    kind: 'graphql' | 'http'
    operation: string
}

/**
 * Records `http_request_duration_seconds` for every inbound operation. For
 * GraphQL it labels by the root field name (register/login/me/...); for REST by
 * "METHOD /route". Operation-level latency complements the OTel traces.
 */
@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
    constructor(
        @InjectMetric(METRIC.httpDuration)
        private readonly histogram: Histogram<string>,
    ) {}

    intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
        const { kind, operation } = this.describe(executionContext)
        // Capture the active trace now (context is guaranteed active here) and seed
        // it as the timer's exemplar, so the slow request links to its trace.
        const traceId = trace.getActiveSpan()?.spanContext().traceId
        const stopTimer = this.histogram.startTimer({}, traceId ? { trace_id: traceId } : {})

        return next.handle().pipe(
            tap({
                complete: () => stopTimer({ kind, operation, status: 'success' }),
                error: () => stopTimer({ kind, operation, status: 'error' }),
            }),
        )
    }

    private describe(executionContext: ExecutionContext): Described {
        if (executionContext.getType<GqlContextType>() === 'graphql') {
            const info = GqlExecutionContext.create(executionContext).getInfo<{
                fieldName: string
            }>()
            return { kind: 'graphql', operation: info.fieldName }
        }

        const req = executionContext.switchToHttp().getRequest<{
            method: string
            route?: { path?: string }
            url: string
        }>()

        return {
            kind: 'http',
            operation: `${req.method} ${req.route?.path ?? req.url}`,
        }
    }
}
