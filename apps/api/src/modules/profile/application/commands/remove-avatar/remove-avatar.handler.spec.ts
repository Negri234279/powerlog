import { describe, expect, it } from 'vitest'

import {
    FakeAvatarStorage,
    FakeClock,
    FakeProfileConfig,
    InMemoryProfileRepository,
} from '../../../../../../tests/doubles/profile'
import { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { RemoveAvatarCommand } from './remove-avatar.command'
import { RemoveAvatarHandler } from './remove-avatar.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('RemoveAvatarHandler', () => {
    it('clears the avatar, deletes the object, and returns the default URL', async () => {
        const profile = ProfileAggregate.create({ userId: 'u-1', displayName: DisplayNameVO.create('Rafa'), now: NOW })
        profile.setAvatar('u-1.webp', NOW)
        const profiles = new InMemoryProfileRepository([profile])
        const storage = new FakeAvatarStorage()
        await storage.save('u-1.webp', Buffer.from('webp'), 'image/webp')
        const handler = new RemoveAvatarHandler(
            profiles,
            storage,
            new AvatarUrls(storage, new FakeProfileConfig()),
            new FakeClock(NOW),
        )

        const view = await handler.execute(new RemoveAvatarCommand('u-1'))

        expect(profiles.all()[0]?.avatarKey).toBeNull()
        expect(storage.objects.has('u-1.webp')).toBe(false)
        expect(view.avatarUrl).toBeNull()
    })

    it('throws when the profile does not exist', async () => {
        const storage = new FakeAvatarStorage()
        const handler = new RemoveAvatarHandler(
            new InMemoryProfileRepository(),
            storage,
            new AvatarUrls(storage, new FakeProfileConfig()),
            new FakeClock(NOW),
        )
        await expect(handler.execute(new RemoveAvatarCommand('missing'))).rejects.toBeInstanceOf(ProfileNotFoundError)
    })
})
