import type { PasswordResetTokenEntity } from '../entities/password-reset-token.entity'

export interface CreatePasswordResetTokenInput {
    userId: string
    tokenHash: string
    expiresAt: Date
}

/**
 * Persistence port for password-reset tokens. Tokens are single-use (`consume`)
 * and hashed; lookup is by hash.
 */
export abstract class PasswordResetTokenRepository {
    abstract create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenEntity>
    abstract findByHash(tokenHash: string): Promise<PasswordResetTokenEntity | null>
    /** Mark a token consumed (single-use). */
    abstract consume(id: string, now: Date): Promise<void>
}
