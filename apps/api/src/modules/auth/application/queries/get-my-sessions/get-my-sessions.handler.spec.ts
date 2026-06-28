import { describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeRefreshTokenGenerator,
    InMemoryRefreshTokenRepository,
} from '../../../../../../tests/doubles/auth'
import { RefreshTokenMother } from '../../../../../../tests/mothers/auth'
import { GetMySessionsHandler } from './get-my-sessions.handler'
import { GetMySessionsQuery } from './get-my-sessions.query'

const NOW = new Date('2026-06-01T00:00:00.000Z')

// FakeRefreshTokenGenerator.hash('raw-current') === 'hash:raw-current'.
function setup() {
    const refreshTokens = new InMemoryRefreshTokenRepository([
        RefreshTokenMother.valid()
            .withId('t-a')
            .forUser('u-1')
            .inFamily('fam-a')
            .withTokenHash('hash:raw-current')
            .onDevice('Chrome', '1.1.1.1')
            .build(),
        RefreshTokenMother.valid()
            .withId('t-b')
            .forUser('u-1')
            .inFamily('fam-b')
            .withTokenHash('hash:other')
            .onDevice('Safari', '2.2.2.2')
            .build(),
        // A different user's session must never appear.
        RefreshTokenMother.valid().withId('t-x').forUser('u-2').inFamily('fam-x').withTokenHash('hash:x').build(),
    ])
    const handler = new GetMySessionsHandler(refreshTokens, new FakeRefreshTokenGenerator(), new FakeClock(NOW))
    return { handler }
}

describe('GetMySessionsHandler', () => {
    it('lists the user’s sessions and flags the current one', async () => {
        const { handler } = setup()

        const sessions = await handler.execute(new GetMySessionsQuery('u-1', 'raw-current'))

        expect(sessions.map((s) => s.id).sort()).toEqual(['fam-a', 'fam-b'])
        expect(sessions.find((s) => s.id === 'fam-a')?.current).toBe(true)
        expect(sessions.find((s) => s.id === 'fam-b')?.current).toBe(false)
        expect(sessions.find((s) => s.id === 'fam-a')?.userAgent).toBe('Chrome')
    })

    it('marks none current when no refresh token is provided', async () => {
        const { handler } = setup()
        const sessions = await handler.execute(new GetMySessionsQuery('u-1'))
        expect(sessions.every((s) => !s.current)).toBe(true)
    })
})
