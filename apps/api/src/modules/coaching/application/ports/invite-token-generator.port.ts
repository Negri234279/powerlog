export interface GeneratedInviteToken {
    /** The opaque token to embed in the signup link (never persisted). */
    raw: string
    /** The SHA-256 hash of `raw`, persisted so a DB leak yields no usable token. */
    hash: string
}

/**
 * Generates opaque invitation tokens and hashes incoming ones for lookup.
 * Coaching owns its own generator (like its Clock/IdGenerator) rather than
 * crossing into auth's equivalent.
 */
export abstract class InviteTokenGenerator {
    abstract generate(): GeneratedInviteToken
    abstract hash(raw: string): string
}
