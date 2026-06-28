import {
    type GeneratedRefreshToken,
    RefreshTokenGenerator,
} from '../../../src/modules/auth/application/ports/refresh-token-generator.port'

/**
 * Deterministic refresh-token generator. `raw` and `hash` are always distinct
 * (so tests can prove the raw token is never persisted) and `hash(raw)` is
 * stable, so a presented raw token resolves back to its stored hash.
 */
export class FakeRefreshTokenGenerator extends RefreshTokenGenerator {
    private counter = 0

    generate(): GeneratedRefreshToken {
        const raw = `raw-${++this.counter}`
        return { raw, hash: this.hash(raw) }
    }

    hash(raw: string): string {
        return `hash:${raw}`
    }
}
