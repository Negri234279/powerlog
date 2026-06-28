import { describe, expect, it } from 'vitest'

import {
    FakeAvatarStorage,
    FakeClock,
    FakeProfileConfig,
    InMemoryProfileRepository,
} from '../../../../../../tests/doubles/profile'
import { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { DisplayNameAlreadyInUseError, ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { UpdateProfileCommand } from './update-profile.command'
import { UpdateProfileHandler } from './update-profile.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(seed: ProfileAggregate[] = [profile('u-1', 'lifter')]) {
    const profiles = new InMemoryProfileRepository(seed)
    const avatarUrls = new AvatarUrls(new FakeAvatarStorage(), new FakeProfileConfig())
    const handler = new UpdateProfileHandler(profiles, new FakeClock(NOW), avatarUrls)
    return { profiles, handler }
}

function profile(userId: string, displayName: string): ProfileAggregate {
    return ProfileAggregate.create({ userId, displayName: DisplayNameVO.create(displayName), now: NOW })
}

describe('UpdateProfileHandler', () => {
    it('updates fields and returns the new view', async () => {
        const { handler } = setup()

        const view = await handler.execute(
            new UpdateProfileCommand('u-1', {
                firstName: 'Rafa',
                sex: 'male',
                heightCm: 183,
                bio: 'Powerlifter',
            }),
        )

        expect(view).toMatchObject({
            userId: 'u-1',
            firstName: 'Rafa',
            sex: 'male',
            heightCm: 183,
            bio: 'Powerlifter',
        })
    })

    it('throws when the profile does not exist', async () => {
        const { handler } = setup([])
        await expect(handler.execute(new UpdateProfileCommand('u-1', { bio: 'x' }))).rejects.toBeInstanceOf(
            ProfileNotFoundError,
        )
    })

    it('changes the display name (handle)', async () => {
        const { handler, profiles } = setup()

        const view = await handler.execute(new UpdateProfileCommand('u-1', { displayName: 'newhandle' }))

        expect(view.displayName).toBe('newhandle')
        expect(profiles.all()[0]?.displayName.value).toBe('newhandle')
    })

    it('aborts (nothing written) when the handle is taken by another user', async () => {
        const { handler, profiles } = setup([profile('u-1', 'lifter'), profile('u-2', 'taken')])

        await expect(
            handler.execute(new UpdateProfileCommand('u-1', { displayName: 'taken', bio: 'changed' })),
        ).rejects.toBeInstanceOf(DisplayNameAlreadyInUseError)

        const mine = profiles.all().find((p) => p.userId === 'u-1')
        expect(mine?.displayName.value).toBe('lifter')
        expect(mine?.bio).toBeNull()
    })

    it('allows keeping your own handle unchanged', async () => {
        const { handler } = setup()

        const view = await handler.execute(new UpdateProfileCommand('u-1', { displayName: 'lifter', bio: 'hi' }))

        expect(view.displayName).toBe('lifter')
        expect(view.bio).toBe('hi')
    })
})
