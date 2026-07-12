import {
    type GeneratedInviteToken,
    InviteTokenGenerator,
} from '../../../src/modules/coaching/application/ports/invite-token-generator.port'

/**
 * Deterministic InviteTokenGenerator double. `generate()` yields sequential
 * `raw-N` tokens; `hash(raw)` is a stable, invertible-looking `hash(raw)` string
 * — so a token minted by `generate()` resolves through `hash()` in tests.
 */
export class FakeInviteTokenGenerator extends InviteTokenGenerator {
    private n = 0

    generate(): GeneratedInviteToken {
        const raw = `raw-${++this.n}`
        return { raw, hash: this.hash(raw) }
    }

    hash(raw: string): string {
        return `hash(${raw})`
    }
}
