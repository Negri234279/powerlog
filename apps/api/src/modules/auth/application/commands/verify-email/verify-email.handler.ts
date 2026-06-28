import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvalidEmailVerificationTokenError } from '../../../domain/errors/auth.errors'
import { EmailVerificationTokenRepository } from '../../../domain/repositories/email-verification-token.repository'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { Clock } from '../../ports/clock.port'
import { OpaqueTokenGenerator } from '../../ports/opaque-token-generator.port'
import { VerifyEmailCommand } from './verify-email.command'

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand, void> {
    constructor(
        private readonly tokens: EmailVerificationTokenRepository,
        private readonly users: UserRepository,
        private readonly tokenGenerator: OpaqueTokenGenerator,
        private readonly clock: Clock,
    ) {}

    async execute(command: VerifyEmailCommand): Promise<void> {
        const now = this.clock.now()
        const token = await this.tokens.findByHash(this.tokenGenerator.hash(command.token))
        if (!token || !token.isActive(now)) {
            throw new InvalidEmailVerificationTokenError()
        }

        const user = await this.users.findById(token.userId)
        if (!user) {
            throw new InvalidEmailVerificationTokenError()
        }

        user.verifyEmail(now)
        await this.users.save(user)
        await this.tokens.consume(token.id, now)
    }
}
