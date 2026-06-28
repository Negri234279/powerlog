/**
 * Generates aggregate/entity ids in the application layer, so the domain stays
 * pure (no id generation inside entities). Infrastructure uses crypto.randomUUID.
 */
export abstract class IdGenerator {
    abstract uuid(): string
}
