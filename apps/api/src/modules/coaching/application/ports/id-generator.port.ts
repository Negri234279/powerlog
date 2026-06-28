/**
 * Generates entity ids in the application layer, so the domain stays pure.
 * Infrastructure uses crypto.randomUUID.
 */
export abstract class IdGenerator {
    abstract uuid(): string
}
