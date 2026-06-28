import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvalidRefreshTokenError } from '../../../domain/errors/auth.errors'
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { AuthMetrics } from '../../ports/auth-metrics.port'
import { Clock } from '../../ports/clock.port'
import { RefreshTokenGenerator } from '../../ports/refresh-token-generator.port'
import type { AuthSessionResult } from '../../results/auth-session.result'
import { SessionIssuer } from '../../services/session-issuer.service'
import { RefreshSessionCommand } from './refresh-session.command'

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand, AuthSessionResult> {
    constructor(
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly users: UserRepository,
        private readonly refreshGenerator: RefreshTokenGenerator,
        private readonly clock: Clock,
        private readonly sessions: SessionIssuer,
        private readonly metrics: AuthMetrics,
    ) {}

    async execute(command: RefreshSessionCommand): Promise<AuthSessionResult> {
        const tokenHash = this.refreshGenerator.hash(command.refreshToken)
        const token = await this.refreshTokens.findByHash(tokenHash)
        if (!token) {
            this.metrics.recordRefresh('invalid')
            throw new InvalidRefreshTokenError()
        }

        if (!token.isActive(this.clock.now())) {
            // Presenting an already-revoked token = likely theft of a rotated token.
            // Revoke the whole family so the attacker and victim are both logged out.
            if (token.isRevoked()) {
                this.metrics.recordRefresh('reuse_detected')
                await this.refreshTokens.revokeFamily(token.family)
            } else {
                this.metrics.recordRefresh('invalid')
            }
            throw new InvalidRefreshTokenError()
        }

        // Reload the user so the new access token carries fresh role/admin claims.
        const user = await this.users.findById(token.userId)
        if (!user || !user.canAuthenticate()) {
            this.metrics.recordRefresh('invalid')
            throw new InvalidRefreshTokenError()
        }

        const session = await this.sessions.issue(
            {
                userId: user.id,
                email: user.email.value,
                role: user.role.value,
                isAdmin: user.isAdmin,
            },
            token.family,
            command.device,
        )
        await this.refreshTokens.revoke(token.id, session.refreshTokenId)
        this.metrics.recordRefresh('rotated')

        return {
            userId: token.userId,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        }
    }
}
