import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { EmailAlreadyVerifiedError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { EmailVerificationIssuer } from '../../services/email-verification-issuer.service'
import { ResendEmailVerificationCommand } from './resend-email-verification.command'

@CommandHandler(ResendEmailVerificationCommand)
export class ResendEmailVerificationHandler implements ICommandHandler<ResendEmailVerificationCommand, void> {
    constructor(
        private readonly users: UserRepository,
        private readonly verification: EmailVerificationIssuer,
    ) {}

    async execute(command: ResendEmailVerificationCommand): Promise<void> {
        const user = await this.users.findById(command.userId)
        if (!user) {
            throw new UserNotFoundError()
        }
        if (user.isEmailVerified()) {
            throw new EmailAlreadyVerifiedError()
        }
        await this.verification.issue(user.id, user.email.value)
    }
}
