import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryRefreshTokenRepository, InMemoryUserRepository } from '../../../../../../tests/doubles/auth'
import { RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { RefreshTokenMother, UserMother } from '../../../../../../tests/mothers/auth'
import { UserDeletedIntegrationEvent } from '../../../../../shared/integration-events/user-deleted.integration-event'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { DeleteAccountCommand } from './delete-account.command'
import { DeleteAccountHandler } from './delete-account.handler'

const NOW = new Date('2026-06-01T00:00:00.000Z')

function setup(seedUsers = [] as ReturnType<UserMother['buildExisting']>[]) {
    const users = new InMemoryUserRepository(seedUsers)
    const tokens = new InMemoryRefreshTokenRepository([
        RefreshTokenMother.valid().withId('t-1').forUser('u-1').inFamily('fam-1').withTokenHash('h-1').build(),
    ])
    const eventBus = new RecordingEventBus()
    const handler = new DeleteAccountHandler(users, tokens, new FakeClock(NOW), eventBus.asEventBus())
    return { handler, users, tokens, eventBus }
}

describe('DeleteAccountHandler', () => {
    it('soft-deletes the account, scrubs PII, kills sessions and announces it', async () => {
        const user = UserMother.create().withId('u-1').withEmail('rafa@example.com').buildExisting()
        const ctx = setup([user])

        await ctx.handler.execute(new DeleteAccountCommand('u-1'))

        const stored = ctx.users.all()[0]
        expect(stored?.status).toBe('deleted')
        expect(stored?.email.value).not.toContain('rafa@example.com')

        // Every session is gone (logged out everywhere).
        expect(await ctx.tokens.findActiveByUser('u-1')).toHaveLength(0)

        // Other modules are told to erase the data they own.
        const event = ctx.eventBus.firstOf(UserDeletedIntegrationEvent)
        expect(event?.userId).toBe('u-1')
    })

    it('throws when the user does not exist', async () => {
        const ctx = setup()
        await expect(ctx.handler.execute(new DeleteAccountCommand('missing'))).rejects.toBeInstanceOf(UserNotFoundError)
    })
})
