import { EmailVerificationTokenEntity } from '../../../domain/entities/email-verification-token.entity'
import type { emailVerificationTokens } from '../schema/email-verification-tokens.schema'

type EmailVerificationTokenRow = typeof emailVerificationTokens.$inferSelect

export const EmailVerificationTokenMapper = {
    toDomain(row: EmailVerificationTokenRow): EmailVerificationTokenEntity {
        return EmailVerificationTokenEntity.rehydrate({
            id: row.id,
            userId: row.userId,
            tokenHash: row.tokenHash,
            expiresAt: row.expiresAt,
            consumedAt: row.consumedAt,
            createdAt: row.createdAt,
        })
    },
}
