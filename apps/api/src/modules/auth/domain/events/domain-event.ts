/**
 * Marker interface for domain events. Aggregates extend `AggregateRoot` and
 * `apply()` these; handlers publish them via `EventPublisher.mergeObjectContext`
 * + `commit()` after a successful save.
 */
export interface DomainEvent {
    readonly occurredAt: Date
}
