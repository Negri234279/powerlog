import { describe, expect, it } from 'vitest'

import { FakeRefreshTokenGenerator, InMemoryRefreshTokenRepository } from '../../../../../../tests/doubles/auth'
import { RefreshTokenMother } from '../../../../../../tests/mothers/auth'
import { RevokeOtherSessionsCommand } from './revoke-other-sessions.command'
import { RevokeOtherSessionsHandler } from './revoke-other-sessions.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')

function setup() {
    const refreshTokens = new InMemoryRefreshTokenRepository([
        RefreshTokenMother.valid()
            .withId('t-a')
            .forUser('u-1')
            .inFamily('fam-a')
            .withTokenHash('hash:raw-current')
            .build(),
        RefreshTokenMother.valid().withId('t-b').forUser('u-1').inFamily('fam-b').withTokenHash('h-b').build(),
        RefreshTokenMother.valid().withId('t-c').forUser('u-1').inFamily('fam-c').withTokenHash('h-c').build(),
    ])
    const handler = new RevokeOtherSessionsHandler(refreshTokens, new FakeRefreshTokenGenerator())
    return { handler, refreshTokens }
}

describe('RevokeOtherSessionsHandler', () => {
    it('revokes every session except the current one', async () => {
        const ctx = setup()

        await ctx.handler.execute(new RevokeOtherSessionsCommand('u-1', 'raw-current'))

        const active = (await ctx.refreshTokens.findActiveByUser('u-1')).filter((t) => t.isActive(NOW))
        expect(active.map((t) => t.family)).toEqual(['fam-a'])
    })
})
