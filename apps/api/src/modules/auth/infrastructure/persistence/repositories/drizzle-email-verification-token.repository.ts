import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { EmailVerificationTokenEntity } from '../../../domain/entities/email-verification-token.entity'
import {
    type CreateEmailVerificationTokenInput,
    EmailVerificationTokenRepository,
} from '../../../domain/repositories/email-verification-token.repository'
import { emailVerificationTokens } from '../schema/email-verification-tokens.schema'
import { EmailVerificationTokenMapper } from '../mappers/email-verification-token.mapper'

@Injectable()
export class DrizzleEmailVerificationTokenRepository extends EmailVerificationTokenRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationTokenEntity> {
        const [row] = await this.db
            .insert(emailVerificationTokens)
            .values({ userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt })
            .returning()

        if (!row) {
            throw new Error('Failed to persist email verification token.')
        }

        return EmailVerificationTokenMapper.toDomain(row)
    }

    async findByHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null> {
        const [row] = await this.db
            .select()
            .from(emailVerificationTokens)
            .where(eq(emailVerificationTokens.tokenHash, tokenHash))
            .limit(1)

        return row ? EmailVerificationTokenMapper.toDomain(row) : null
    }

    async consume(id: string, now: Date): Promise<void> {
        await this.db.update(emailVerificationTokens).set({ consumedAt: now }).where(eq(emailVerificationTokens.id, id))
    }
}
