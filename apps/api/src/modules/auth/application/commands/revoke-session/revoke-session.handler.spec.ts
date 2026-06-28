import { describe, expect, it } from 'vitest'

import { InMemoryRefreshTokenRepository } from '../../../../../../tests/doubles/auth'
import { RefreshTokenMother } from '../../../../../../tests/mothers/auth'
import { RevokeSessionCommand } from './revoke-session.command'
import { RevokeSessionHandler } from './revoke-session.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')

function setup() {
    const refreshTokens = new InMemoryRefreshTokenRepository([
        RefreshTokenMother.valid().withId('t-a').forUser('u-1').inFamily('fam-a').withTokenHash('h-a').build(),
        RefreshTokenMother.valid().withId('t-x').forUser('u-2').inFamily('fam-x').withTokenHash('h-x').build(),
    ])
    const handler = new RevokeSessionHandler(refreshTokens)
    return { handler, refreshTokens }
}

describe('RevokeSessionHandler', () => {
    it('revokes the user’s own session', async () => {
        const ctx = setup()

        await ctx.handler.execute(new RevokeSessionCommand('u-1', 'fam-a'))

        expect((await ctx.refreshTokens.findActiveByUser('u-1')).filter((t) => t.isActive(NOW))).toHaveLength(0)
    })

    it('does not revoke a session belonging to another user', async () => {
        const ctx = setup()

        await ctx.handler.execute(new RevokeSessionCommand('u-1', 'fam-x'))

        expect((await ctx.refreshTokens.findActiveByUser('u-2')).filter((t) => t.isActive(NOW))).toHaveLength(1)
    })
})
