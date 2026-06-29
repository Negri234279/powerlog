import { Histogram, Registry } from 'prom-client'

/**
 * A real prom-client Histogram on a throwaway registry, for unit tests that need
 * to satisfy an `@InjectMetric` histogram dependency without touching the global
 * default registry or mocking.
 */
export function testHistogram(labelNames: string[] = []): Histogram<string> {
    return new Histogram({
        name: 'test_histogram_seconds',
        help: 'test',
        labelNames,
        registers: [new Registry()],
    })
}
