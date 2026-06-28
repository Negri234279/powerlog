/**
 * Generates aggregate ids in the application layer (so the aggregate has its id
 * before persistence and can emit events). Infrastructure uses crypto.randomUUID.
 */
export abstract class IdGenerator {
    abstract uuid(): string
}
