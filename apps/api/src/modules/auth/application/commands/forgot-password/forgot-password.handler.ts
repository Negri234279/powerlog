import { Logger } from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { UserRepository } from '../../../domain/repositories/user.repository'
import { EmailVO } from '../../../domain/value-objects/email.vo'
import { PasswordResetIssuer } from '../../services/password-reset-issuer.service'
import { ForgotPasswordCommand } from './forgot-password.command'

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand, void> {
    private readonly logger = new Logger(ForgotPasswordHandler.name)

    constructor(
        private readonly users: UserRepository,
        private readonly reset: PasswordResetIssuer,
    ) {}

    async execute(command: ForgotPasswordCommand): Promise<void> {
        const user = await this.users.findByEmail(EmailVO.create(command.email))
        // Always succeed regardless of whether the email exists (anti-enumeration).
        if (!user) {
            return
        }
        try {
            await this.reset.issue(user.id, user.email.value)
        } catch (err) {
            this.logger.error(`Failed to send password reset email for user ${user.id}: ${String(err)}`)
        }
    }
}
