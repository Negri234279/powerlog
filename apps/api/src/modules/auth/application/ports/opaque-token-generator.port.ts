export interface GeneratedToken {
    /** Opaque token handed to the client (e.g. in an email link). */
    raw: string
    /** SHA-256 of `raw` — the only form persisted. */
    hash: string
}

/**
 * Generates opaque single-use tokens (email verification, password reset) and
 * hashes incoming ones for lookup. Distinct from the refresh-token generator so
 * each concern owns its port; implemented in infrastructure with node crypto.
 */
export abstract class OpaqueTokenGenerator {
    abstract generate(): GeneratedToken
    abstract hash(raw: string): string
}
