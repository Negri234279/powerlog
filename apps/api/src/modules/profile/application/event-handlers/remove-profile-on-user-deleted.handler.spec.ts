import { describe, expect, it } from 'vitest'

import { FakeAvatarStorage, InMemoryProfileRepository } from '../../../../../tests/doubles/profile'
import { UserDeletedIntegrationEvent } from '../../../../shared/integration-events/user-deleted.integration-event'
import { ProfileAggregate } from '../../domain/entities/profile.entity'
import { DisplayNameVO } from '../../domain/value-objects/display-name.vo'
import { RemoveProfileOnUserDeleted } from './remove-profile-on-user-deleted.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')

function profileWithAvatar(userId: string, avatarKey: string): ProfileAggregate {
    const profile = ProfileAggregate.create({ userId, displayName: DisplayNameVO.create('Rafa'), now: NOW })
    profile.setAvatar(avatarKey, NOW)
    return profile
}

describe('RemoveProfileOnUserDeleted', () => {
    it('deletes the profile and its stored avatar', async () => {
        const profiles = new InMemoryProfileRepository([profileWithAvatar('u-1', 'u-1.webp')])
        const storage = new FakeAvatarStorage()
        await storage.save('u-1.webp', Buffer.from([1]), 'image/webp')
        const handler = new RemoveProfileOnUserDeleted(profiles, storage)

        await handler.handle(new UserDeletedIntegrationEvent('u-1'))

        expect(await profiles.findByUserId('u-1')).toBeNull()
        expect(storage.objects.has('u-1.webp')).toBe(false)
    })

    it('is a no-op when there is no profile', async () => {
        const profiles = new InMemoryProfileRepository()
        const handler = new RemoveProfileOnUserDeleted(profiles, new FakeAvatarStorage())

        await expect(handler.handle(new UserDeletedIntegrationEvent('ghost'))).resolves.toBeUndefined()
    })
})
