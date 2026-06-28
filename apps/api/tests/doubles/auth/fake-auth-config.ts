import { AuthConfig } from '../../../src/modules/auth/application/ports/auth-config.port'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

/** AuthConfig with fixed values, overridable per test. */
export class FakeAuthConfig extends AuthConfig {
    constructor(
        readonly refreshTokenTtlMs: number = SEVEN_DAYS_MS,
        readonly emailVerificationTtlMs: number = ONE_DAY_MS,
        readonly passwordResetTtlMs: number = ONE_HOUR_MS,
        readonly webOrigin: string = 'http://localhost:3000',
    ) {
        super()
    }
}
