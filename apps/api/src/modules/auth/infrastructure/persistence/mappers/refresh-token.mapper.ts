import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity'
import type { refreshTokens } from '../schema/refresh-tokens.schema'

type RefreshTokenRow = typeof refreshTokens.$inferSelect

export const RefreshTokenMapper = {
    toDomain(row: RefreshTokenRow): RefreshTokenEntity {
        return RefreshTokenEntity.rehydrate({
            id: row.id,
            userId: row.userId,
            family: row.family,
            tokenHash: row.tokenHash,
            expiresAt: row.expiresAt,
            revokedAt: row.revokedAt,
            replacedBy: row.replacedBy,
            userAgent: row.userAgent,
            ip: row.ip,
            createdAt: row.createdAt,
        })
    },
}
