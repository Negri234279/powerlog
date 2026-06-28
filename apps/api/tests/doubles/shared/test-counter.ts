import { Counter, type LabelValues, Registry } from 'prom-client'

/**
 * A real prom-client Counter on a throwaway registry, for unit tests that need
 * to satisfy an `@InjectMetric` dependency (and optionally assert counts) without
 * touching the global default registry or mocking.
 */
export function testCounter(labelNames: string[] = []): Counter<string> {
    return new Counter({
        name: 'test_counter_total',
        help: 'test',
        labelNames,
        registers: [new Registry()],
    })
}

/** Reads the value recorded for a given label set (0 if none). */
export async function counterValue(metric: Counter<string>, labels: LabelValues<string>): Promise<number> {
    const { values } = await metric.get()
    return values.find((v) => Object.entries(labels).every(([k, val]) => v.labels[k] === val))?.value ?? 0
}
