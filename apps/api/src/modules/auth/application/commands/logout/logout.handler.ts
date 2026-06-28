import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { RefreshTokenGenerator } from '../../ports/refresh-token-generator.port'
import { LogoutCommand } from './logout.command'

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
    constructor(
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly refreshGenerator: RefreshTokenGenerator,
    ) {}

    async execute(command: LogoutCommand): Promise<void> {
        if (!command.refreshToken) return

        const tokenHash = this.refreshGenerator.hash(command.refreshToken)
        const token = await this.refreshTokens.findByHash(tokenHash)
        if (token && !token.isRevoked()) {
            await this.refreshTokens.revoke(token.id, null)
        }
    }
}
