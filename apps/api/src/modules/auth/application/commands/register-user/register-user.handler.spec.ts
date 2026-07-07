import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeAuthConfig,
    FakeClock,
    FakeIdGenerator,
    FakePasswordHasher,
    FakeRefreshTokenGenerator,
    FakeTokenSigner,
    InMemoryRefreshTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { FakeProfiles, fakeEventPublisher, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { UserMother } from '../../../../../../tests/mothers/auth'
import { UserRegisteredIntegrationEvent } from '../../../../../shared/integration-events/user-registered.integration-event'
import { EmailAlreadyInUseError } from '../../../domain/errors/auth.errors'
import { SessionIssuer } from '../../services/session-issuer.service'
import { RegisterUserCommand } from './register-user.command'
import { RegisterUserHandler } from './register-user.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup(seed = [] as ReturnType<UserMother['buildExisting']>[]) {
    const users = new InMemoryUserRepository(seed)
    const refreshTokens = new InMemoryRefreshTokenRepository()
    const hasher = new FakePasswordHasher()
    const signer = new FakeTokenSigner()
    const refreshGenerator = new FakeRefreshTokenGenerator()
    const clock = new FakeClock(NOW)
    // First id → the new user; second id → the refresh-token family.
    const ids = new FakeIdGenerator(['user-1', 'family-1'])
    // Profile boundary: provisioning populates the snapshot the SessionIssuer reads.
    const profiles = new FakeProfiles()
    const sessions = new SessionIssuer(
        signer,
        refreshGenerator,
        refreshTokens,
        clock,
        new FakeAuthConfig(),
        ids,
        profiles,
    )
    const eventBus = new RecordingEventBus()
    const handler = new RegisterUserHandler(
        users,
        hasher,
        ids,
        clock,
        sessions,
        fakeEventPublisher(),
        eventBus.asEventBus(),
        profiles,
    )
    return { handler, users, refreshTokens, signer, eventBus, profiles }
}

describe('RegisterUserHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('persists a new athlete user and issues a session', async () => {
        const result = await ctx.handler.execute(new RegisterUserCommand('New@Example.com', 'supersecret', 'NewLifter'))

        const saved = ctx.users.all()
        expect(saved).toHaveLength(1)
        expect(saved[0]?.email.value).toBe('new@example.com')
        expect(saved[0]?.hasPassword()).toBe(true)
        expect(saved[0]?.role.value).toBe('athlete')
        expect(saved[0]?.isAdmin).toBe(false)
        expect(result.userId).toBe('user-1')
    })

    it('signs an access token carrying sub, email, username (from the profile), role and isAdmin', async () => {
        const result = await ctx.handler.execute(new RegisterUserCommand('new@example.com', 'supersecret', 'newlifter'))

        expect(await ctx.signer.verifyAccessToken(result.accessToken)).toEqual({
            userId: 'user-1',
            email: 'new@example.com',
            username: 'newlifter',
            role: 'athlete',
            isAdmin: false,
            avatar: null,
            locale: null,
        })
    })

    it('persists only the hashed refresh token, never the raw value', async () => {
        const result = await ctx.handler.execute(new RegisterUserCommand('new@example.com', 'supersecret', 'newlifter'))

        const stored = ctx.refreshTokens.all()
        expect(stored).toHaveLength(1)
        expect(stored[0]?.tokenHash).not.toBe(result.refreshToken)
        expect(stored[0]?.family).toBe('family-1')
    })

    it('publishes a UserRegisteredIntegrationEvent for the profile module', async () => {
        await ctx.handler.execute(new RegisterUserCommand('new@example.com', 'supersecret', 'newlifter'))

        const event = ctx.eventBus.firstOf(UserRegisteredIntegrationEvent)
        expect(event).toBeDefined()
        expect(event?.userId).toBe('user-1')
        expect(event?.email).toBe('new@example.com')
        expect(event?.source).toBe('password')
        expect(event?.google).toBeUndefined()
    })

    it('provisions the profile with the chosen handle and optional sign-up details', async () => {
        await ctx.handler.execute(
            new RegisterUserCommand('new@example.com', 'supersecret', 'newlifter', 'kg', {
                firstName: 'Ada',
                lastName: 'Lovelace',
                birthDate: '1990-12-10',
                heightCm: 170,
                locale: 'es',
            }),
        )

        expect(ctx.profiles.calls).toHaveLength(1)
        expect(ctx.profiles.calls[0]).toMatchObject({
            userId: 'user-1',
            email: 'new@example.com',
            username: 'newlifter',
            firstName: 'Ada',
            lastName: 'Lovelace',
            birthDate: '1990-12-10',
            heightCm: 170,
            locale: 'es',
        })
    })

    it('rolls back the new user when profile provisioning fails (e.g. handle taken)', async () => {
        ctx.profiles.failWith(new Error('handle already taken'))

        await expect(
            ctx.handler.execute(new RegisterUserCommand('new@example.com', 'supersecret', 'newlifter')),
        ).rejects.toThrow('handle already taken')

        // Compensation: the just-created user is gone, no session/event leaked.
        expect(ctx.users.all()).toHaveLength(0)
        expect(ctx.refreshTokens.all()).toHaveLength(0)
        expect(ctx.eventBus.firstOf(UserRegisteredIntegrationEvent)).toBeUndefined()
    })

    it('rejects an email already in use without persisting a second user', async () => {
        const existing = UserMother.create().withEmail('taken@example.com').buildExisting()
        ctx = setup([existing])

        await expect(
            ctx.handler.execute(new RegisterUserCommand('taken@example.com', 'pw123long', 'freshname')),
        ).rejects.toBeInstanceOf(EmailAlreadyInUseError)
        expect(ctx.users.all()).toHaveLength(1)
    })
})
