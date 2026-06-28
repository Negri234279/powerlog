import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { RevokeSessionCommand } from './revoke-session.command'

@CommandHandler(RevokeSessionCommand)
export class RevokeSessionHandler implements ICommandHandler<RevokeSessionCommand, void> {
    constructor(private readonly refreshTokens: RefreshTokenRepository) {}

    async execute(command: RevokeSessionCommand): Promise<void> {
        // Only revoke a family that actually belongs to the user (no cross-user
        // revocation); silently no-op otherwise so nothing is leaked.
        const active = await this.refreshTokens.findActiveByUser(command.userId)
        if (active.some((token) => token.family === command.sessionId)) {
            await this.refreshTokens.revokeFamily(command.sessionId)
        }
    }
}
