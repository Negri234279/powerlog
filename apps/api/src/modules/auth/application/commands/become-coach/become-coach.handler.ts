import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { UserRoleChangedIntegrationEvent } from '../../../../../shared/integration-events/user-role-changed.integration-event'
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
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: BecomeCoachCommand): Promise<AuthSessionResult> {
        const user = await this.users.findById(command.userId)
        if (!user) {
            throw new UserNotFoundError()
        }

        const wasCoach = user.role.value === 'coach'
        user.becomeCoach(this.clock.now())
        await this.users.save(user)

        // With no live subscription the role picks the free plan, so this changed
        // what the user may do and the cached answer has to go. Only when it really
        // moved: `becomeCoach` is idempotent, and an event saying "changed" about a
        // no-op would be a lie to every future consumer.
        if (!wasCoach) {
            this.eventBus.publish(new UserRoleChangedIntegrationEvent(user.id, user.role.value))
        }

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
