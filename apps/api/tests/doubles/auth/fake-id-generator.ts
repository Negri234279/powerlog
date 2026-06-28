import { IdGenerator } from '../../../src/modules/auth/application/ports/id-generator.port'

/**
 * Deterministic id generator. Returns ids from an optional queue first (so a
 * test can assert a specific family/user id), then falls back to a counter.
 */
export class FakeIdGenerator extends IdGenerator {
    private counter = 0

    constructor(private readonly queue: string[] = []) {
        super()
    }

    uuid(): string {
        return this.queue.shift() ?? `id-${++this.counter}`
    }

    /** Pre-load the next ids to be handed out, in order. */
    enqueue(...ids: string[]): void {
        this.queue.push(...ids)
    }
}
