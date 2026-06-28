import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { GoogleIdentityLinkedIntegrationEvent } from '../../../../shared/integration-events/google-identity-linked.integration-event'
import { ProfileRepository } from '../../domain/repositories/profile.repository'
import { PersonNameVO } from '../../domain/value-objects/person-name.vo'
import { Clock } from '../ports/clock.port'
import { AvatarIngestor } from '../services/avatar-ingestor.service'

/**
 * When a Google identity is linked to an existing account, backfill the
 * first/last name and avatar from Google — but only where the profile left them
 * empty (never overwrite what the user set).
 */
@EventsHandler(GoogleIdentityLinkedIntegrationEvent)
export class FillProfileOnGoogleLinked implements IEventHandler<GoogleIdentityLinkedIntegrationEvent> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly clock: Clock,
        private readonly avatars: AvatarIngestor,
    ) {}

    async handle(event: GoogleIdentityLinkedIntegrationEvent): Promise<void> {
        const profile = await this.profiles.findByUserId(event.userId)
        if (!profile) {
            return
        }

        const now = this.clock.now()
        const google = event.google
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
