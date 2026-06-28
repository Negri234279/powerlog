import { describe, expect, it } from 'vitest'

import {
    FakeAvatarStorage,
    FakeProfileConfig,
    InMemoryProfileRepository,
} from '../../../../../../tests/doubles/profile'
import { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { PersonNameVO } from '../../../domain/value-objects/person-name.vo'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { GetMyProfileHandler } from './get-my-profile.handler'
import { GetMyProfileQuery } from './get-my-profile.query'

const NOW = new Date('2026-01-01T00:00:00.000Z')
const avatarUrls = () => new AvatarUrls(new FakeAvatarStorage(), new FakeProfileConfig())

describe('GetMyProfileHandler', () => {
    it('returns the profile view', async () => {
        const profile = ProfileAggregate.create({
            userId: 'u-1',
            displayName: DisplayNameVO.create('rafa'),
            firstName: PersonNameVO.create('Rafa'),
            now: NOW,
        })
        const handler = new GetMyProfileHandler(new InMemoryProfileRepository([profile]), avatarUrls())

        const view = await handler.execute(new GetMyProfileQuery('u-1'))

        expect(view).toMatchObject({
            userId: 'u-1',
            displayName: 'rafa',
            firstName: 'Rafa',
            sex: null,
            avatarUrl: null,
        })
    })

    it('throws when the profile does not exist', async () => {
        const handler = new GetMyProfileHandler(new InMemoryProfileRepository(), avatarUrls())
        await expect(handler.execute(new GetMyProfileQuery('missing'))).rejects.toBeInstanceOf(ProfileNotFoundError)
    })
})
