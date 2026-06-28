import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvalidCredentialsError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { EmailVO } from '../../../domain/value-objects/email.vo'
import { AuthMetrics } from '../../ports/auth-metrics.port'
import { PasswordHasher } from '../../ports/password-hasher.port'
import type { AuthSessionResult } from '../../results/auth-session.result'
import { SessionIssuer } from '../../services/session-issuer.service'
import { LoginCommand } from './login.command'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthSessionResult> {
    constructor(
        private readonly users: UserRepository,
        private readonly hasher: PasswordHasher,
        private readonly sessions: SessionIssuer,
        private readonly metrics: AuthMetrics,
    ) {}

    async execute(command: LoginCommand): Promise<AuthSessionResult> {
        const email = EmailVO.create(command.email)
        const user = await this.users.findByEmail(email)
        const hash = user?.passwordHash?.value

        // Same error whether the user is missing, is Google-only, or the password
        // is wrong — never reveal which. (Timing-based enumeration is a known
        // residual risk; revisit with a constant-time dummy verify if needed.)
        if (!user || !hash || !(await this.hasher.verify(hash, command.password))) {
            this.metrics.recordLogin('password', 'failure')
            throw new InvalidCredentialsError()
        }

        // A disabled/deleted account can't authenticate. Same generic error as a
        // wrong password, so it doesn't reveal the account's state.
        if (!user.canAuthenticate()) {
            this.metrics.recordLogin('password', 'failure')
            throw new InvalidCredentialsError()
        }

        const session = await this.sessions.issue(
            {
                userId: user.id,
                email: user.email.value,
                role: user.role.value,
                isAdmin: user.isAdmin,
            },
            undefined,
            command.device,
        )
        this.metrics.recordLogin('password', 'success')

        return {
            userId: user.id,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        }
    }
}
