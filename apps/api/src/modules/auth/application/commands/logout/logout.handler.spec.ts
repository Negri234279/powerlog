import { describe, expect, it } from 'vitest'

import { FakeRefreshTokenGenerator, InMemoryRefreshTokenRepository } from '../../../../../../tests/doubles/auth'
import { RefreshTokenMother } from '../../../../../../tests/mothers/auth'
import type { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity'
import { LogoutCommand } from './logout.command'
import { LogoutHandler } from './logout.handler'

function setup(tokens: RefreshTokenEntity[] = []) {
    const refreshTokens = new InMemoryRefreshTokenRepository(tokens)
    const handler = new LogoutHandler(refreshTokens, new FakeRefreshTokenGenerator())
    return { handler, refreshTokens }
}

describe('LogoutHandler', () => {
    it('revokes the presented active token', async () => {
        const token = RefreshTokenMother.valid().withId('t-1').withTokenHash('hash:session').build()
        const ctx = setup([token])

        await ctx.handler.execute(new LogoutCommand('session'))

        expect(ctx.refreshTokens.all()[0]?.isRevoked()).toBe(true)
    })

    it('is a no-op when no refresh token is presented', async () => {
        const token = RefreshTokenMother.valid().withId('t-1').withTokenHash('hash:session').build()
        const ctx = setup([token])

        await expect(ctx.handler.execute(new LogoutCommand(undefined))).resolves.toBeUndefined()
        expect(ctx.refreshTokens.all()[0]?.isRevoked()).toBe(false)
    })

    it('is idempotent on an already-revoked token', async () => {
        const token = RefreshTokenMother.revoked().withId('t-1').withTokenHash('hash:gone').build()
        const ctx = setup([token])

        await expect(ctx.handler.execute(new LogoutCommand('gone'))).resolves.toBeUndefined()
        expect(ctx.refreshTokens.all()[0]?.isRevoked()).toBe(true)
    })

    it('ignores an unknown token', async () => {
        const ctx = setup()
        await expect(ctx.handler.execute(new LogoutCommand('unknown'))).resolves.toBeUndefined()
    })
})
