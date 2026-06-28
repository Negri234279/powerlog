import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { PasswordResetTokenEntity } from '../../../domain/entities/password-reset-token.entity'
import {
    type CreatePasswordResetTokenInput,
    PasswordResetTokenRepository,
} from '../../../domain/repositories/password-reset-token.repository'
import { passwordResetTokens } from '../schema/password-reset-tokens.schema'
import { PasswordResetTokenMapper } from '../mappers/password-reset-token.mapper'

@Injectable()
export class DrizzlePasswordResetTokenRepository extends PasswordResetTokenRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenEntity> {
        const [row] = await this.db
            .insert(passwordResetTokens)
            .values({ userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt })
            .returning()
        if (!row) throw new Error('Failed to persist password reset token.')
        return PasswordResetTokenMapper.toDomain(row)
    }

    async findByHash(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
        const [row] = await this.db
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.tokenHash, tokenHash))
            .limit(1)
        return row ? PasswordResetTokenMapper.toDomain(row) : null
    }

    async consume(id: string, now: Date): Promise<void> {
        await this.db.update(passwordResetTokens).set({ consumedAt: now }).where(eq(passwordResetTokens.id, id))
    }
}
