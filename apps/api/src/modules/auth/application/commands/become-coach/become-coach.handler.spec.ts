import { describe, expect, it } from 'vitest'

import {
    FakeAuthConfig,
    FakeClock,
    FakeIdGenerator,
    FakeRefreshTokenGenerator,
    FakeTokenSigner,
    InMemoryRefreshTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { FakeProfiles } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { SessionIssuer } from '../../services/session-issuer.service'
import { BecomeCoachCommand } from './become-coach.command'
import { BecomeCoachHandler } from './become-coach.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(seed = [] as ReturnType<UserMother['buildExisting']>[]) {
    const users = new InMemoryUserRepository(seed)
    const signer = new FakeTokenSigner()
    const profiles = new FakeProfiles()
    for (const u of seed) profiles.set(u.id, { username: 'gymrat', avatarUrl: null })
    const sessions = new SessionIssuer(
        signer,
        new FakeRefreshTokenGenerator(),
        new InMemoryRefreshTokenRepository(),
        new FakeClock(NOW),
        new FakeAuthConfig(),
        new FakeIdGenerator(['family-1']),
        profiles,
    )
    const handler = new BecomeCoachHandler(users, new FakeClock(NOW), sessions)
    return { handler, users, signer }
}

describe('BecomeCoachHandler', () => {
    it('promotes the user and re-issues a session carrying role=coach', async () => {
        const ctx = setup([UserMother.athlete().withId('u-1').withEmail('lifter@example.com').buildExisting()])

        const result = await ctx.handler.execute(new BecomeCoachCommand('u-1'))

        expect((await ctx.users.findById('u-1'))?.role.value).toBe('coach')
        expect(await ctx.signer.verifyAccessToken(result.accessToken)).toMatchObject({ userId: 'u-1', role: 'coach' })
    })

    it('throws when the user does not exist', async () => {
        const ctx = setup()

        await expect(ctx.handler.execute(new BecomeCoachCommand('missing'))).rejects.toBeInstanceOf(UserNotFoundError)
    })
})
