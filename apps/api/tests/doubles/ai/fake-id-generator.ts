import { IdGenerator } from '../../../src/modules/ai/application/ports/id-generator.port'

/** Deterministic ids, so a test can assert on them. */
export class FakeIdGenerator extends IdGenerator {
    private next = 0

    constructor(private readonly prefix = 'id') {
        super()
    }

    uuid(): string {
        this.next += 1

        return `${this.prefix}-${this.next}`
    }
}
