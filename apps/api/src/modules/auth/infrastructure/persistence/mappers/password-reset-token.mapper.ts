import { PasswordResetTokenEntity } from '../../../domain/entities/password-reset-token.entity'
import type { passwordResetTokens } from '../schema/password-reset-tokens.schema'

type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect

export const PasswordResetTokenMapper = {
    toDomain(row: PasswordResetTokenRow): PasswordResetTokenEntity {
        return PasswordResetTokenEntity.rehydrate({
            id: row.id,
            userId: row.userId,
            tokenHash: row.tokenHash,
            expiresAt: row.expiresAt,
            consumedAt: row.consumedAt,
            createdAt: row.createdAt,
        })
    },
}
