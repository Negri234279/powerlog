import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { RefreshTokenGenerator } from '../../ports/refresh-token-generator.port'
import { RevokeOtherSessionsCommand } from './revoke-other-sessions.command'

@CommandHandler(RevokeOtherSessionsCommand)
export class RevokeOtherSessionsHandler implements ICommandHandler<RevokeOtherSessionsCommand, void> {
    constructor(
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly refreshGenerator: RefreshTokenGenerator,
    ) {}

    async execute(command: RevokeOtherSessionsCommand): Promise<void> {
        const currentFamily = await this.resolveCurrentFamily(command.currentRefreshToken)
        const active = await this.refreshTokens.findActiveByUser(command.userId)
        const families = new Set(active.map((token) => token.family))

        for (const family of families) {
            if (family !== currentFamily) {
                await this.refreshTokens.revokeFamily(family)
            }
        }
    }

    private async resolveCurrentFamily(rawToken?: string): Promise<string | null> {
        if (!rawToken) return null
        const token = await this.refreshTokens.findByHash(this.refreshGenerator.hash(rawToken))
        return token?.family ?? null
    }
}
