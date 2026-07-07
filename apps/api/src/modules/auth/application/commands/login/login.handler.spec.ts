import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeAuthConfig,
    FakeAuthMetrics,
    FakeClock,
    FakeIdGenerator,
    FakePasswordHasher,
    FakeRefreshTokenGenerator,
    FakeTokenSigner,
    InMemoryRefreshTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { FakeProfiles } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { InvalidCredentialsError } from '../../../domain/errors/auth.errors'
import { SessionIssuer } from '../../services/session-issuer.service'
import { LoginCommand } from './login.command'
import { LoginHandler } from './login.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')
// FakePasswordHasher.hash("correct horse") produces this PHC-shaped string.
const HASH_FOR = (plain: string) => `$argon2id$v=19$fake$${plain}`

function setup(seed = [] as ReturnType<UserMother['buildExisting']>[]) {
    const users = new InMemoryUserRepository(seed)
    const refreshTokens = new InMemoryRefreshTokenRepository()
    const signer = new FakeTokenSigner()
    const profiles = new FakeProfiles()
    for (const u of seed) profiles.set(u.id, { username: 'gymrat', avatarUrl: null, locale: null })
    const sessions = new SessionIssuer(
        signer,
        new FakeRefreshTokenGenerator(),
        refreshTokens,
        new FakeClock(NOW),
        new FakeAuthConfig(),
        new FakeIdGenerator(['family-1']),
        profiles,
    )
    const metrics = new FakeAuthMetrics()
    const handler = new LoginHandler(users, new FakePasswordHasher(), sessions, metrics)
    return { handler, users, refreshTokens, signer, metrics }
}

describe('LoginHandler', () => {
    let ctx: ReturnType<typeof setup>

    describe('with a matching coach+admin account', () => {
        beforeEach(() => {
            const user = UserMother.coach()
                .asAdmin()
                .withId('user-1')
                .withEmail('coach@example.com')
                .withPassword(HASH_FOR('correcthorse'))
                .buildExisting()
            ctx = setup([user])
        })

        it("issues a session with the user's role and admin flag in the token", async () => {
            const result = await ctx.handler.execute(new LoginCommand('coach@example.com', 'correcthorse'))

            expect(result.userId).toBe('user-1')
            expect(await ctx.signer.verifyAccessToken(result.accessToken)).toEqual({
                userId: 'user-1',
                email: 'coach@example.com',
                username: 'gymrat',
                role: 'coach',
                isAdmin: true,
                avatar: null,
                locale: null,
            })
            expect(ctx.refreshTokens.all()).toHaveLength(1)
            expect(ctx.metrics.logins).toEqual([{ method: 'password', outcome: 'success' }])
        })

        it('rejects a wrong password with a generic error', async () => {
            await expect(ctx.handler.execute(new LoginCommand('coach@example.com', 'wrong'))).rejects.toBeInstanceOf(
                InvalidCredentialsError,
            )
            expect(ctx.metrics.logins).toEqual([{ method: 'password', outcome: 'failure' }])
        })
    })

    it('rejects an unknown email with the same generic error', async () => {
        ctx = setup()
        await expect(ctx.handler.execute(new LoginCommand('nobody@example.com', 'whatever'))).rejects.toBeInstanceOf(
            InvalidCredentialsError,
        )
    })

    it('rejects a Google-only account (no password) with the generic error', async () => {
        const googleOnly = UserMother.create().withEmail('google@example.com').withoutPassword().buildExisting()
        ctx = setup([googleOnly])

        await expect(ctx.handler.execute(new LoginCommand('google@example.com', 'anything'))).rejects.toBeInstanceOf(
            InvalidCredentialsError,
        )
    })

    it('rejects a disabled account with the same generic error (even with the right password)', async () => {
        const disabled = UserMother.create()
            .withEmail('banned@example.com')
            .withPassword(HASH_FOR('correcthorse'))
            .disabled()
            .buildExisting()
        ctx = setup([disabled])

        await expect(
            ctx.handler.execute(new LoginCommand('banned@example.com', 'correcthorse')),
        ).rejects.toBeInstanceOf(InvalidCredentialsError)
    })
})
