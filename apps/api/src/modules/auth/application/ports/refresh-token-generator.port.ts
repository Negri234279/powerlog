export interface GeneratedRefreshToken {
    /** Opaque token handed to the client (stored in an HTTPOnly cookie). */
    raw: string
    /** SHA-256 of `raw` — the only form persisted in the DB. */
    hash: string
}

/**
 * Generates opaque refresh tokens and hashes incoming ones for lookup.
 * Implemented in infrastructure with node crypto (random bytes + SHA-256).
 */
export abstract class RefreshTokenGenerator {
    abstract generate(): GeneratedRefreshToken
    /** Hash a raw token received from the client to find it in the DB. */
    abstract hash(raw: string): string
}
