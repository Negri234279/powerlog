import { describe, expect, it } from 'vitest'

import {
    FakeAuthConfig,
    FakeAuthMetrics,
    FakeClock,
    FakeIdGenerator,
    FakeRefreshTokenGenerator,
    FakeTokenSigner,
    InMemoryRefreshTokenRepository,
    InMemoryUserRepository,
} from '../../../../../../tests/doubles/auth'
import { FakeProfiles } from '../../../../../../tests/doubles/shared'
import { RefreshTokenMother, UserMother } from '../../../../../../tests/mothers/auth'
import type { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity'
import { InvalidRefreshTokenError } from '../../../domain/errors/auth.errors'
import { SessionIssuer } from '../../services/session-issuer.service'
import { RefreshSessionCommand } from './refresh-session.command'
import { RefreshSessionHandler } from './refresh-session.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')

function setup(opts: { users?: ReturnType<UserMother['buildExisting']>[]; tokens?: RefreshTokenEntity[] }) {
    const users = new InMemoryUserRepository(opts.users ?? [])
    const refreshTokens = new InMemoryRefreshTokenRepository(opts.tokens ?? [])
    const refreshGenerator = new FakeRefreshTokenGenerator()
    const signer = new FakeTokenSigner()
    const profiles = new FakeProfiles()
    for (const u of opts.users ?? []) profiles.set(u.id, { username: 'gymrat', avatarUrl: null, locale: null })
    const sessions = new SessionIssuer(
        signer,
        refreshGenerator,
        refreshTokens,
        new FakeClock(NOW),
        new FakeAuthConfig(),
        new FakeIdGenerator(['unused-family']),
        profiles,
    )
    const metrics = new FakeAuthMetrics()
    const handler = new RefreshSessionHandler(
        refreshTokens,
        users,
        refreshGenerator,
        new FakeClock(NOW),
        sessions,
        metrics,
    )
    return { handler, users, refreshTokens, signer, metrics }
}

describe('RefreshSessionHandler', () => {
    it('rotates the token within the same family and refreshes the claims', async () => {
        const user = UserMother.coach().asAdmin().withId('u-1').buildExisting()
        const current = RefreshTokenMother.valid()
            .withId('t-current')
            .forUser('u-1')
            .inFamily('fam-1')
            .withTokenHash('hash:current')
            .build()
        const ctx = setup({ users: [user], tokens: [current] })

        const result = await ctx.handler.execute(new RefreshSessionCommand('current'))

        const rotated = ctx.refreshTokens.all().find((t) => t.tokenHash === 'hash:current')
        expect(rotated?.isRevoked()).toBe(true)
        expect(rotated?.replacedBy).not.toBeNull()

        const active = ctx.refreshTokens.all().filter((t) => !t.isRevoked())
        expect(active).toHaveLength(1)
        expect(active[0]?.family).toBe('fam-1')

        expect(await ctx.signer.verifyAccessToken(result.accessToken)).toEqual({
            userId: 'u-1',
            email: user.email.value,
            username: 'gymrat',
            role: 'coach',
            isAdmin: true,
            avatar: null,
            locale: null,
        })
        expect(ctx.metrics.refreshes).toEqual(['rotated'])
    })

    it('revokes the whole family when an already-revoked token is reused', async () => {
        const stolen = RefreshTokenMother.revoked()
            .withId('t-stolen')
            .inFamily('fam-2')
            .withTokenHash('hash:stolen')
            .build()
        const sibling = RefreshTokenMother.valid()
            .withId('t-sibling')
            .inFamily('fam-2')
            .withTokenHash('hash:sibling')
            .build()
        const ctx = setup({ tokens: [stolen, sibling] })

        await expect(ctx.handler.execute(new RefreshSessionCommand('stolen'))).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        )

        const stillActive = ctx.refreshTokens.all().filter((t) => !t.isRevoked())
        expect(stillActive).toHaveLength(0)
        expect(ctx.metrics.refreshes).toEqual(['reuse_detected'])
    })

    it('rejects an unknown token', async () => {
        const ctx = setup({})
        await expect(ctx.handler.execute(new RefreshSessionCommand('nope'))).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        )
        expect(ctx.metrics.refreshes).toEqual(['invalid'])
    })

    it('rejects an expired token without revoking its family', async () => {
        const expired = RefreshTokenMother.expired()
            .withId('t-expired')
            .inFamily('fam-3')
            .withTokenHash('hash:expired')
            .build()
        const sibling = RefreshTokenMother.valid()
            .withId('t-sibling')
            .inFamily('fam-3')
            .withTokenHash('hash:sibling')
            .build()
        const ctx = setup({ tokens: [expired, sibling] })

        await expect(ctx.handler.execute(new RefreshSessionCommand('expired'))).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        )

        const sib = ctx.refreshTokens.all().find((t) => t.id === 't-sibling')
        expect(sib?.isRevoked()).toBe(false)
    })

    it('rejects an active token whose user no longer exists', async () => {
        const orphan = RefreshTokenMother.valid()
            .withId('t-orphan')
            .forUser('ghost')
            .withTokenHash('hash:orphan')
            .build()
        const ctx = setup({ tokens: [orphan] })

        await expect(ctx.handler.execute(new RefreshSessionCommand('orphan'))).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        )
    })

    it('rejects refresh for a disabled account', async () => {
        const user = UserMother.create().withId('u-disabled').disabled().buildExisting()
        const token = RefreshTokenMother.valid()
            .withId('t-d')
            .forUser('u-disabled')
            .inFamily('fam-d')
            .withTokenHash('hash:d')
            .build()
        const ctx = setup({ users: [user], tokens: [token] })

        await expect(ctx.handler.execute(new RefreshSessionCommand('d'))).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        )
    })
})
