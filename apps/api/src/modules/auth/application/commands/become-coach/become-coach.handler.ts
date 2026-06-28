import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { Clock } from '../../ports/clock.port'
import type { AuthSessionResult } from '../../results/auth-session.result'
import { SessionIssuer } from '../../services/session-issuer.service'
import { BecomeCoachCommand } from './become-coach.command'

@CommandHandler(BecomeCoachCommand)
export class BecomeCoachHandler implements ICommandHandler<BecomeCoachCommand, AuthSessionResult> {
    constructor(
        private readonly users: UserRepository,
        private readonly clock: Clock,
        private readonly sessions: SessionIssuer,
    ) {}

    async execute(command: BecomeCoachCommand): Promise<AuthSessionResult> {
        const user = await this.users.findById(command.userId)
        if (!user) {
            throw new UserNotFoundError()
        }

        user.becomeCoach(this.clock.now())
        await this.users.save(user)

        // Fresh session carries role=coach so coach-gated routes work right away.
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
        return {
            userId: user.id,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        }
    }
}
