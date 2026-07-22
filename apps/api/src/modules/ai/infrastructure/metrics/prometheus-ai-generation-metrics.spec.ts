import { getToken } from '@willsoto/nestjs-prometheus'
import type { Counter, Histogram } from 'prom-client'
import { describe, expect, it } from 'vitest'

import { METRIC, metricsProviders } from '../../../../observability/metrics'
import { PrometheusAiGenerationMetrics } from './prometheus-ai-generation-metrics'

/**
 * Build a metric from its REAL declaration in `observability/metrics`.
 *
 * Constructing a convenient one here instead would defeat the point: the bug
 * these tests exist for was a mismatch between how the metric is *declared* and
 * how the adapter *records* it. `enableExemplars` makes prom-client swap
 * `observe(labels, value)` for a single-object `observeWithExemplar`, so the
 * declaration silently decides which call is correct — and only the real one can
 * catch the pair drifting apart.
 */
/** The shape `makeCounterProvider` and friends actually return. */
interface MetricProvider {
    provide: string
    useFactory: (options: undefined) => unknown
}

function fromDeclaration<T>(name: string): T {
    const token = getToken(name)
    const provider = (metricsProviders as unknown as MetricProvider[]).find((candidate) => candidate.provide === token)
    if (!provider) throw new Error(`no metric declared for ${name}`)

    return provider.useFactory(undefined) as T
}

const adapter = () =>
    new PrometheusAiGenerationMetrics(
        fromDeclaration<Counter<string>>(METRIC.aiGenerationsQueued),
        fromDeclaration<Histogram<string>>(METRIC.aiGenerationDuration),
    )

describe('PrometheusAiGenerationMetrics', () => {
    it('records a queued job the way its counter is declared', () => {
        expect(() => adapter().recordQueued('mesocycle')).not.toThrow()
    })

    it('records the duration it was handed, not undefined', async () => {
        const duration = fromDeclaration<Histogram<string>>(METRIC.aiGenerationDuration)
        const metrics = new PrometheusAiGenerationMetrics(
            fromDeclaration<Counter<string>>(METRIC.aiGenerationsQueued),
            duration,
        )

        metrics.recordSettled('session_plan', 'succeeded', 9.8)

        // The sum for this label set is the observation itself: a call that went
        // through `observeWithExemplar` by mistake would have thrown, and one that
        // recorded nothing would leave this at zero.
        const { values } = await duration.get()
        const sum = values.find(
            (sample) =>
                sample.metricName?.endsWith('_sum') &&
                sample.labels['kind'] === 'session_plan' &&
                sample.labels['status'] === 'succeeded',
        )
        expect(sum?.value).toBe(9.8)
    })
})
