import type { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity'

export interface CreateEmailVerificationTokenInput {
    userId: string
    tokenHash: string
    expiresAt: Date
}

/**
 * Persistence port for email-verification tokens. Tokens are single-use
 * (`consume`) and hashed; lookup is by hash.
 */
export abstract class EmailVerificationTokenRepository {
    abstract create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationTokenEntity>
    abstract findByHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null>
    /** Mark a token consumed (single-use). */
    abstract consume(id: string, now: Date): Promise<void>
}
