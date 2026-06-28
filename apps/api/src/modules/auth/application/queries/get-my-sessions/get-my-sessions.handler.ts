import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity'
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { Clock } from '../../ports/clock.port'
import { RefreshTokenGenerator } from '../../ports/refresh-token-generator.port'
import { GetMySessionsQuery } from './get-my-sessions.query'

/** A device/session in the user's session list. `id` is the refresh-token family. */
export interface SessionView {
    id: string
    userAgent: string | null
    ip: string | null
    lastUsedAt: Date
    current: boolean
}

@QueryHandler(GetMySessionsQuery)
export class GetMySessionsHandler implements IQueryHandler<GetMySessionsQuery, SessionView[]> {
    constructor(
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly refreshGenerator: RefreshTokenGenerator,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetMySessionsQuery): Promise<SessionView[]> {
        const now = this.clock.now()
        const active = (await this.refreshTokens.findActiveByUser(query.userId)).filter((t) => t.isActive(now))
        const currentFamily = await this.resolveCurrentFamily(query.currentRefreshToken)

        // One row per family — the latest token represents the live session.
        const latestByFamily = new Map<string, RefreshTokenEntity>()
        for (const token of active) {
            const existing = latestByFamily.get(token.family)
            if (!existing || token.createdAt.getTime() > existing.createdAt.getTime()) {
                latestByFamily.set(token.family, token)
            }
        }

        return [...latestByFamily.values()]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((token) => ({
                id: token.family,
                userAgent: token.userAgent,
                ip: token.ip,
                lastUsedAt: token.createdAt,
                current: token.family === currentFamily,
            }))
    }

    private async resolveCurrentFamily(rawToken?: string): Promise<string | null> {
        if (!rawToken) return null

        const token = await this.refreshTokens.findByHash(this.refreshGenerator.hash(rawToken))
        return token?.family ?? null
    }
}
