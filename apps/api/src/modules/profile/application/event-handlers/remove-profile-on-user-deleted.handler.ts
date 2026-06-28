import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { ProfileRepository } from '../../domain/repositories/profile.repository'
import { AvatarStorage } from '../ports/avatar-storage.port'

/**
 * Erases the profile when its user soft-deletes their account (GDPR). The
 * profile holds personal data (name, birth date, height, avatar) with no legal
 * retention need, so it's hard-deleted along with the stored avatar object.
 * Idempotent: re-delivery with no profile left is a no-op.
 */
@EventsHandler(UserDeletedIntegrationEvent)
export class RemoveProfileOnUserDeleted implements IEventHandler<UserDeletedIntegrationEvent> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly storage: AvatarStorage,
    ) {}

    async handle(event: UserDeletedIntegrationEvent): Promise<void> {
        const profile = await this.profiles.findByUserId(event.userId)
        if (!profile) return

        const avatarKey = profile.avatarKey
        await this.profiles.deleteByUserId(event.userId)

        // Best-effort: an orphaned object is not worth failing the erasure over.
        if (avatarKey) {
            await this.storage.delete(avatarKey).catch(() => undefined)
        }
    }
}
