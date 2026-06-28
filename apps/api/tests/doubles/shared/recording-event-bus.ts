import type { EventBus } from '@nestjs/cqrs'

/**
 * Records events published on the bus so application tests can assert the
 * cross-module contract a handler emits (a behavioural output, not a mock call).
 */
export class RecordingEventBus {
    readonly published: unknown[] = []

    publish(event: unknown): void {
        this.published.push(event)
    }

    publishAll(events: unknown[]): void {
        this.published.push(...events)
    }

    /** The first published event of the given type, or undefined. */
    firstOf<T>(type: new (...args: never[]) => T): T | undefined {
        return this.published.find((e): e is T => e instanceof type)
    }

    /** Cast to the Nest EventBus shape for constructor injection in tests. */
    asEventBus(): EventBus {
        return this as unknown as EventBus
    }
}
