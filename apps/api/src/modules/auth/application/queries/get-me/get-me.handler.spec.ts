import { describe, expect, it } from 'vitest'

import { InMemoryUserRepository } from '../../../../../../tests/doubles/auth'
import { FakeProfiles } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { GetMeHandler } from './get-me.handler'
import { GetMeQuery } from './get-me.query'

describe('GetMeHandler', () => {
    it('returns the user view including role, isAdmin and emailVerified', async () => {
        const user = UserMother.coach()
            .asAdmin()
            .withId('u-1')
            .withEmail('coach@example.com')
            .withUnits('lb')
            .emailVerified()
            .buildExisting()
        const profiles = new FakeProfiles().set('u-1', { username: 'coachy', avatarUrl: null, locale: null })
        const handler = new GetMeHandler(new InMemoryUserRepository([user]), profiles)

        const view = await handler.execute(new GetMeQuery('u-1'))

        expect(view).toEqual({
            id: 'u-1',
            email: 'coach@example.com',
            username: 'coachy',
            units: 'lb',
            role: 'coach',
            isAdmin: true,
            emailVerified: true,
            hasPassword: true,
            createdAt: user.createdAt,
        })
    })

    it('throws when the user does not exist', async () => {
        const handler = new GetMeHandler(new InMemoryUserRepository(), new FakeProfiles())
        await expect(handler.execute(new GetMeQuery('missing'))).rejects.toBeInstanceOf(UserNotFoundError)
    })

    it('hides a soft-deleted account (treated as not found)', async () => {
        const user = UserMother.create().withId('u-1').deleted().buildExisting()
        const handler = new GetMeHandler(new InMemoryUserRepository([user]), new FakeProfiles())
        await expect(handler.execute(new GetMeQuery('u-1'))).rejects.toBeInstanceOf(UserNotFoundError)
    })
})
