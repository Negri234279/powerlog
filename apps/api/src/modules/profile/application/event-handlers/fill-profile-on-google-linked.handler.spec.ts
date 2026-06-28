import { describe, expect, it } from 'vitest'

import {
    FakeAvatarStorage,
    FakeClock,
    FakeImageProcessor,
    InMemoryProfileRepository,
} from '../../../../../tests/doubles/profile'
import { testCounter } from '../../../../../tests/doubles/shared'
import { GoogleIdentityLinkedIntegrationEvent } from '../../../../shared/integration-events/google-identity-linked.integration-event'
import { ProfileAggregate } from '../../domain/entities/profile.entity'
import { DisplayNameVO } from '../../domain/value-objects/display-name.vo'
import { PersonNameVO } from '../../domain/value-objects/person-name.vo'
import { AvatarIngestor } from '../services/avatar-ingestor.service'
import { FillProfileOnGoogleLinked } from './fill-profile-on-google-linked.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')
const makeHandler = (profiles: InMemoryProfileRepository) =>
    new FillProfileOnGoogleLinked(
        profiles,
        new FakeClock(NOW),
        new AvatarIngestor(new FakeImageProcessor(), new FakeAvatarStorage(), testCounter(['source', 'status'])),
    )

function existingProfile(): ProfileAggregate {
    const profile = ProfileAggregate.create({
        userId: 'u-1',
        displayName: DisplayNameVO.create('Rafa'),
        firstName: PersonNameVO.create('Rafa'),
        now: NOW,
    })
    return profile
}

describe('FillProfileOnGoogleLinked', () => {
    it('backfills empty names without overwriting existing ones', async () => {
        const profiles = new InMemoryProfileRepository([existingProfile()])
        const handler = makeHandler(profiles)

        await handler.handle(
            new GoogleIdentityLinkedIntegrationEvent('u-1', { firstName: 'FromGoogle', lastName: 'Lee' }),
        )

        const profile = profiles.all()[0]
        expect(profile?.firstName?.value).toBe('Rafa')
        expect(profile?.lastName?.value).toBe('Lee')
    })

    it('is a no-op when the profile does not exist yet', async () => {
        const profiles = new InMemoryProfileRepository()
        const handler = makeHandler(profiles)

        await expect(
            handler.handle(new GoogleIdentityLinkedIntegrationEvent('ghost', { firstName: 'X' })),
        ).resolves.toBeUndefined()
        expect(profiles.all()).toHaveLength(0)
    })
})
