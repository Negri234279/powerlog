import type { SetOutcome } from '../../domain/set-outcome'

/**
 * Abstracts the set observability counters so the application handlers stay free
 * of prom-client. Infrastructure binds it to a Prometheus-backed adapter; tests
 * use a recording fake. Only carries what the CQRS command-duration metric can't:
 * how the set went. A plain "sets marked" count is already its `_count`.
 */
export abstract class SetMetrics {
    /** A set was marked done as `outcome`. */
    abstract recordCompleted(outcome: SetOutcome): void
}
