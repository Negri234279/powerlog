import { Gauge, type LabelValues, Registry } from 'prom-client'

/**
 * A real prom-client Gauge on a throwaway registry, for unit tests that need to
 * satisfy an `@InjectMetric` dependency (and optionally assert the current value)
 * without touching the global default registry or mocking.
 */
export function testGauge(labelNames: string[] = []): Gauge<string> {
    return new Gauge({
        name: 'test_gauge',
        help: 'test',
        labelNames,
        registers: [new Registry()],
    })
}

/** Reads the value recorded for a given label set (0 if none). */
export async function gaugeValue(metric: Gauge<string>, labels: LabelValues<string> = {}): Promise<number> {
    const { values } = await metric.get()

    return values.find((v) => Object.entries(labels).every(([k, val]) => v.labels[k] === val))?.value ?? 0
}
