import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    FakeAvatarStorage,
    FakeClock,
    FakeImageProcessor,
    InMemoryProfileRepository,
} from '../../../../../tests/doubles/profile'
import { testCounter } from '../../../../../tests/doubles/shared'
import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import { ProfileAggregate } from '../../domain/entities/profile.entity'
import { DisplayNameVO } from '../../domain/value-objects/display-name.vo'
import { AvatarIngestor } from '../services/avatar-ingestor.service'
import { CreateProfileOnUserRegistered } from './create-profile-on-user-registered.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(seed: ProfileAggregate[] = []) {
    const profiles = new InMemoryProfileRepository(seed)
    const ingestor = new AvatarIngestor(
        new FakeImageProcessor(),
        new FakeAvatarStorage(),
        testCounter(['source', 'status']),
    )
    const handler = new CreateProfileOnUserRegistered(profiles, new FakeClock(NOW), ingestor)
    return { profiles, handler }
}

function freshProfile(userId: string): ProfileAggregate {
    // Mirrors a just-provisioned profile: handle set, name/avatar still empty.
    return ProfileAggregate.create({ userId, displayName: DisplayNameVO.create('rafahandle'), now: NOW })
}

describe('CreateProfileOnUserRegistered', () => {
    afterEach(() => vi.restoreAllMocks())

    it('backfills first/last name + photo from Google onto the provisioned profile', async () => {
        // Stub the fetch of the Google photo so no real network call happens.
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
        const { profiles, handler } = setup([freshProfile('u-1')])

        await handler.handle(
            new UserRegisteredIntegrationEvent('u-1', 'rafa@example.com', 'google', {
                displayName: 'Rafa Lifter',
                firstName: 'Rafa',
                lastName: 'Lifter',
                pictureUrl: 'https://google/photo.jpg',
            }),
        )

        const profile = profiles.all()[0]
        // The handle is untouched; only the empty name/avatar are filled.
        expect(profile?.displayName.value).toBe('rafahandle')
        expect(profile?.firstName?.value).toBe('Rafa')
        expect(profile?.lastName?.value).toBe('Lifter')
        expect(profile?.avatarKey).toBe('u-1.webp')
    })

    it('is a no-op for a password sign-up (no Google snapshot)', async () => {
        const { profiles, handler } = setup([freshProfile('u-1')])

        await handler.handle(new UserRegisteredIntegrationEvent('u-1', 'rafa@example.com', 'password'))

        expect(profiles.all()[0]?.firstName).toBeNull()
        expect(profiles.all()[0]?.avatarKey).toBeNull()
    })

    it('is a no-op when the profile does not exist yet', async () => {
        const { profiles, handler } = setup([])

        await handler.handle(
            new UserRegisteredIntegrationEvent('u-1', 'rafa@example.com', 'google', { firstName: 'Rafa' }),
        )

        expect(profiles.all()).toHaveLength(0)
    })
})
