/** Abstracts id generation so handlers stay deterministic in tests. */
export abstract class IdGenerator {
    abstract uuid(): string
}
