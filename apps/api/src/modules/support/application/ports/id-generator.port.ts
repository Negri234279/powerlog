/** Abstracts uuid generation so ids are deterministic under test. */
export abstract class IdGenerator {
    abstract uuid(): string
}
