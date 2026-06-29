import { describe, expect, it } from 'vitest'

import {
    FakeAvatarStorage,
    FakeClock,
    FakeImageProcessor,
    FakeProfileConfig,
    InMemoryProfileRepository,
} from '../../../../../../tests/doubles/profile'
import { testCounter } from '../../../../../../tests/doubles/shared'
import { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { AvatarIngestor } from '../../services/avatar-ingestor.service'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { SetAvatarCommand } from './set-avatar.command'
import { SetAvatarHandler } from './set-avatar.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(seedExisting = true) {
    const profiles = new InMemoryProfileRepository(
        seedExisting
            ? [ProfileAggregate.create({ userId: 'u-1', displayName: DisplayNameVO.create('Rafa'), now: NOW })]
            : [],
    )
    const storage = new FakeAvatarStorage()
    const ingestor = new AvatarIngestor(new FakeImageProcessor(), storage, testCounter(['source', 'status']))
    const avatarUrls = new AvatarUrls(storage, new FakeProfileConfig())
    const handler = new SetAvatarHandler(profiles, ingestor, avatarUrls, new FakeClock(NOW))
    return { profiles, storage, handler }
}

describe('SetAvatarHandler', () => {
    it('stores the processed avatar and returns its URL', async () => {
        const ctx = setup()

        const view = await ctx.handler.execute(new SetAvatarCommand('u-1', Buffer.from('jpeg-bytes')))

        expect(ctx.profiles.all()[0]?.avatarKey).toBe('u-1.webp')
        expect(ctx.storage.objects.get('u-1.webp')?.contentType).toBe('image/webp')
        // URL carries an `?v=<updatedAt>` cache-buster so a re-upload isn't served stale.
        expect(view.avatarUrl).toBe(`https://cdn.test/u-1.webp?v=${NOW.getTime()}`)
    })

    it('throws when the profile does not exist', async () => {
        const ctx = setup(false)
        await expect(ctx.handler.execute(new SetAvatarCommand('u-1', Buffer.from('x')))).rejects.toBeInstanceOf(
            ProfileNotFoundError,
        )
    })
})
