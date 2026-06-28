/**
 * Hashes and verifies passwords. Implemented in infrastructure (argon2id).
 * Used as a DI token (abstract class) — bound to the concrete adapter in the
 * AuthModule.
 */
export abstract class PasswordHasher {
    abstract hash(plain: string): Promise<string>
    abstract verify(hash: string, plain: string): Promise<boolean>
}
