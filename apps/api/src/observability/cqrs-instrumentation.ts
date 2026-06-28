import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { CommandBus, EventBus, type IEvent, QueryBus } from '@nestjs/cqrs'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { context as otelContext, SpanStatusCode, trace } from '@opentelemetry/api'
import { PinoLogger } from 'nestjs-pino'
import type { Counter, Histogram } from 'prom-client'
import type { Subscription } from 'rxjs'

import { METRIC } from './metrics'

const tracer = trace.getTracer('powerlog-cqrs')

type Bus = {
    execute: (message: unknown, ...rest: unknown[]) => Promise<unknown>
}

function messageName(message: unknown): string {
    return (message as { constructor?: { name?: string } } | null)?.constructor?.name ?? 'Unknown'
}

/**
 * Instruments CQRS centrally without touching handlers or overriding the bus
 * DI token: at bootstrap it wraps the singleton CommandBus/QueryBus `execute`
 * (the same instance the explorer registered handlers on) and subscribes to the
 * EventBus stream. Every command/query gets an OTel span (parent of the pg
 * spans), a Prometheus histogram sample and a structured log carrying the
 * correlationId/trace_id from CLS + OTel.
 */
@Injectable()
export class CqrsInstrumentation implements OnApplicationBootstrap, OnModuleDestroy {
    private eventsSub?: Subscription

    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly logger: PinoLogger,
        @InjectMetric(METRIC.commandDuration)
        private readonly commandDuration: Histogram<string>,
        @InjectMetric(METRIC.queryDuration)
        private readonly queryDuration: Histogram<string>,
        @InjectMetric(METRIC.eventsTotal)
        private readonly eventsTotal: Counter<string>,
    ) {
        this.logger.setContext('Cqrs')
    }

    onApplicationBootstrap(): void {
        this.wrap(this.commandBus as unknown as Bus, 'command', this.commandDuration)
        this.wrap(this.queryBus as unknown as Bus, 'query', this.queryDuration)
        this.eventsSub = this.eventBus.subscribe((event) => this.onEvent(event))
    }

    onModuleDestroy(): void {
        this.eventsSub?.unsubscribe()
    }

    private wrap(bus: Bus, kind: 'command' | 'query', histogram: Histogram<string>): void {
        const original = bus.execute.bind(bus)

        bus.execute = (message: unknown, ...rest: unknown[]): Promise<unknown> => {
            const name = messageName(message)
            const span = tracer.startSpan(`cqrs.${kind} ${name}`, {
                attributes: { 'cqrs.kind': kind, 'cqrs.name': name },
            })
            // Link the slow command/query to its trace as a histogram exemplar.
            const exemplar = { trace_id: span.spanContext().traceId }
            const stopTimer = histogram.startTimer({ [kind]: name }, exemplar)
            const startedAt = Date.now()

            return otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
                try {
                    const result = await original(message, ...rest)

                    stopTimer({ status: 'success' })
                    span.setStatus({ code: SpanStatusCode.OK })

                    this.logger.debug(
                        {
                            [kind]: name,
                            status: 'success',
                            durationMs: Date.now() - startedAt,
                        },
                        `${kind} executed`,
                    )

                    return result
                } catch (error) {
                    stopTimer({ status: 'error' })

                    const err = error as Error
                    span.recordException(err)
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: err.message,
                    })

                    this.logger.warn(
                        {
                            [kind]: name,
                            status: 'error',
                            durationMs: Date.now() - startedAt,
                            err: err.message,
                        },
                        `${kind} failed`,
                    )

                    throw error
                } finally {
                    span.end()
                }
            })
        }
    }

    private onEvent(event: IEvent): void {
        const name = messageName(event)

        this.eventsTotal.inc({ event: name })

        this.logger.debug({ event: name }, 'domain event published')
    }
}
