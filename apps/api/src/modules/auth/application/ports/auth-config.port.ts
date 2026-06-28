/**
 * Auth tuning the application layer needs without reading env directly.
 * Bound in infrastructure from validated config.
 */
export abstract class AuthConfig {
    /** Refresh-token lifetime in milliseconds (used to compute expiresAt). */
    abstract readonly refreshTokenTtlMs: number
    /** Email-verification token lifetime in milliseconds. */
    abstract readonly emailVerificationTtlMs: number
    /** Password-reset token lifetime in milliseconds. */
    abstract readonly passwordResetTtlMs: number
    /** Web origin for links in emails (e.g. the verification URL). */
    abstract readonly webOrigin: string
}
