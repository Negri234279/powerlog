import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvalidPasswordResetTokenError } from '../../../domain/errors/auth.errors'
import { PasswordResetTokenRepository } from '../../../domain/repositories/password-reset-token.repository'
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { PasswordHashVO } from '../../../domain/value-objects/password-hash.vo'
import { Clock } from '../../ports/clock.port'
import { OpaqueTokenGenerator } from '../../ports/opaque-token-generator.port'
import { PasswordHasher } from '../../ports/password-hasher.port'
import { ResetPasswordCommand } from './reset-password.command'

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand, void> {
    constructor(
        private readonly resetTokens: PasswordResetTokenRepository,
        private readonly users: UserRepository,
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly hasher: PasswordHasher,
        private readonly tokenGenerator: OpaqueTokenGenerator,
        private readonly clock: Clock,
    ) {}

    async execute(command: ResetPasswordCommand): Promise<void> {
        const now = this.clock.now()
        const token = await this.resetTokens.findByHash(this.tokenGenerator.hash(command.token))
        if (!token || !token.isActive(now)) {
            throw new InvalidPasswordResetTokenError()
        }

        const user = await this.users.findById(token.userId)
        if (!user) {
            throw new InvalidPasswordResetTokenError()
        }

        user.setPassword(PasswordHashVO.fromHash(await this.hasher.hash(command.newPassword)), now)
        await this.users.save(user)
        await this.resetTokens.consume(token.id, now)
        // A reset implies possible compromise → end every existing session.
        await this.refreshTokens.revokeAllForUser(user.id)
    }
}
