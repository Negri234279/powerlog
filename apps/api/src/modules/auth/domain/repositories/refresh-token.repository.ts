import type { RefreshTokenEntity } from '../entities/refresh-token.entity'

export interface CreateRefreshTokenInput {
    userId: string
    family: string
    tokenHash: string
    expiresAt: Date
    userAgent?: string | null
    ip?: string | null
}

/**
 * Persistence port for refresh tokens. Supports rotation (revoke the old token
 * and point it at its replacement) and family revocation (reuse response).
 */
export abstract class RefreshTokenRepository {
    abstract create(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity>
    abstract findByHash(tokenHash: string): Promise<RefreshTokenEntity | null>
    /** Non-revoked tokens for a user (one per active session/family). */
    abstract findActiveByUser(userId: string): Promise<RefreshTokenEntity[]>
    /** Mark a token revoked, optionally recording the token that replaced it. */
    abstract revoke(id: string, replacedById: string | null): Promise<void>
    /** Revoke every active token in a family (reuse-detection response). */
    abstract revokeFamily(family: string): Promise<void>
    /** Revoke every active token for a user (password reset → log out everywhere). */
    abstract revokeAllForUser(userId: string): Promise<void>
}
