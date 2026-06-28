import {
    type GeneratedToken,
    OpaqueTokenGenerator,
} from '../../../src/modules/auth/application/ports/opaque-token-generator.port'

/**
 * Deterministic opaque-token generator. `raw` and `hash` are always distinct (so
 * tests prove the raw token is never persisted) and `hash(raw)` is stable.
 */
export class FakeTokenGenerator extends OpaqueTokenGenerator {
    private counter = 0

    generate(): GeneratedToken {
        const raw = `token-${++this.counter}`
        return { raw, hash: this.hash(raw) }
    }

    hash(raw: string): string {
        return `hash:${raw}`
    }
}
