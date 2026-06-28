import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity'
import {
    type CreateRefreshTokenInput,
    RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository'
import { refreshTokens } from '../schema/refresh-tokens.schema'
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper'

@Injectable()
export class DrizzleRefreshTokenRepository extends RefreshTokenRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async create(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
        const [row] = await this.db
            .insert(refreshTokens)
            .values({
                userId: input.userId,
                family: input.family,
                tokenHash: input.tokenHash,
                expiresAt: input.expiresAt,
                userAgent: input.userAgent ?? null,
                ip: input.ip ?? null,
            })
            .returning()
        if (!row) throw new Error('Failed to persist refresh token.')
        return RefreshTokenMapper.toDomain(row)
    }

    async findByHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
        const [row] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1)
        return row ? RefreshTokenMapper.toDomain(row) : null
    }

    async findActiveByUser(userId: string): Promise<RefreshTokenEntity[]> {
        const rows = await this.db
            .select()
            .from(refreshTokens)
            .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
        return rows.map((row) => RefreshTokenMapper.toDomain(row))
    }

    async revoke(id: string, replacedById: string | null): Promise<void> {
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date(), replacedBy: replacedById })
            .where(eq(refreshTokens.id, id))
    }

    async revokeFamily(family: string): Promise<void> {
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(and(eq(refreshTokens.family, family), isNull(refreshTokens.revokedAt)))
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
    }
}
