import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import { ProfileRepository } from '../../domain/repositories/profile.repository'
import { PersonNameVO } from '../../domain/value-objects/person-name.vo'
import { Clock } from '../ports/clock.port'
import { AvatarIngestor } from '../services/avatar-ingestor.service'

/**
 * Backfills the profile from Google after registration. The profile itself is
 * created synchronously during registration (auth → `ProvisionProfileCommand`),
 * so this handler only fills first/last name and the avatar from Google when
 * present and still empty — the slow avatar download stays off the sign-up path.
 * No-op for password sign-ups (no Google snapshot). Idempotent.
 */
@EventsHandler(UserRegisteredIntegrationEvent)
export class CreateProfileOnUserRegistered implements IEventHandler<UserRegisteredIntegrationEvent> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly clock: Clock,
        private readonly avatars: AvatarIngestor,
    ) {}

    async handle(event: UserRegisteredIntegrationEvent): Promise<void> {
        const google = event.google
        if (!google) return

        const profile = await this.profiles.findByUserId(event.userId)
        if (!profile) return

        const now = this.clock.now()
        profile.fillMissingNames(
            {
                firstName: google.firstName ? PersonNameVO.create(google.firstName) : undefined,
                lastName: google.lastName ? PersonNameVO.create(google.lastName) : undefined,
            },
            now,
        )

        // Only adopt the Google photo if the user hasn't set a custom one.
        if (profile.avatarKey === null && google.pictureUrl) {
            const key = await this.avatars.ingestFromUrl(event.userId, google.pictureUrl)
            if (key) profile.setAvatar(key, now)
        }
        await this.profiles.save(profile)
    }
}
