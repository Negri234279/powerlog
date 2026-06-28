import { PasswordHasher } from '../../../src/modules/auth/application/ports/password-hasher.port'

// Deterministic, reversible "hash" that still satisfies PasswordHashVO's
// "$argon2" prefix invariant — no real argon2 cost in unit tests.
const PREFIX = '$argon2id$v=19$fake$'

export class FakePasswordHasher extends PasswordHasher {
    async hash(plain: string): Promise<string> {
        return `${PREFIX}${plain}`
    }

    async verify(hash: string, plain: string): Promise<boolean> {
        return hash === `${PREFIX}${plain}`
    }
}
