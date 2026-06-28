import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../../shared/integration-events/user-deleted.integration-event'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { Clock } from '../../ports/clock.port'
import { DeleteAccountCommand } from './delete-account.command'

/**
 * GDPR right-to-erasure for the user's own account. Soft-deletes the user
 * (status → deleted, PII scrubbed, id + timestamps retained), revokes every
 * refresh token so all sessions die, and publishes an event so other modules
 * scrub the personal data they own (profile, etc.). Idempotent: deleting an
 * already-deleted account is a no-op that still tidies up.
 */
@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<DeleteAccountCommand, void> {
    constructor(
        private readonly users: UserRepository,
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly clock: Clock,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: DeleteAccountCommand): Promise<void> {
        const user = await this.users.findById(command.userId)
        if (!user) {
            throw new UserNotFoundError()
        }

        user.softDelete(this.clock.now())
        await this.users.save(user)
        await this.refreshTokens.revokeAllForUser(user.id)

        // Cross-module: lets each module erase the personal data it owns.
        this.eventBus.publish(new UserDeletedIntegrationEvent(user.id))
    }
}
