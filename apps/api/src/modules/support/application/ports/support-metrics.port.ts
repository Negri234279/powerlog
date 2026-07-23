import type { TicketCategory } from '../../domain/ticket-category'

/**
 * Support observability counters, kept out of the application handlers (no
 * prom-client in application). Infrastructure binds a Prometheus adapter; tests use
 * a recording fake. Narrow on purpose — the CQRS command histogram already times
 * the submit; this carries the `category` dimension it can't.
 */
export abstract class SupportMetrics {
    abstract recordTicketOpened(category: TicketCategory): void
}
