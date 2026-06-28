import type { EventPublisher } from '@nestjs/cqrs'

/**
 * EventPublisher double for application tests. `mergeObjectContext` returns the
 * aggregate unchanged — the real one only wires event publishing, which the
 * aggregate (an AggregateRoot) already does via apply()/commit().
 */
export function fakeEventPublisher(): EventPublisher {
    return {
        mergeObjectContext: <T>(aggregate: T): T => aggregate,
    } as unknown as EventPublisher
}
