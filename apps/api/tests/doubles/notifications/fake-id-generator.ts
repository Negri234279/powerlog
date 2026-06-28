import { IdGenerator } from '../../../src/modules/notifications/application/ports/id-generator.port'

/** Deterministic id generator: optional queue first, then a counter. */
export class FakeIdGenerator extends IdGenerator {
    private counter = 0

    constructor(private readonly queue: string[] = []) {
        super()
    }

    uuid(): string {
        return this.queue.shift() ?? `id-${++this.counter}`
    }

    enqueue(...ids: string[]): void {
        this.queue.push(...ids)
    }
}
