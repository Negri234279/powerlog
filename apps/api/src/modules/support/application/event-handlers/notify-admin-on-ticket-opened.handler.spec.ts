import { beforeEach, describe, expect, it } from 'vitest'

import type { ConfigService } from '@nestjs/config'

import { FakeMailer, silentLogger } from '../../../../../tests/doubles/shared'
import type { Env } from '../../../../config/env'
import { type EmailMessage, Mailer } from '../../../../mail/mailer.port'
import { SupportTicketOpenedIntegrationEvent } from '../events/support-ticket-opened.integration-event'
import { NotifyAdminOnTicketOpened } from './notify-admin-on-ticket-opened.handler'

/** Minimal ConfigService stub returning a fixed CONTACT_TO. */
function config(contactTo: string): ConfigService<Env, true> {
    return { get: () => contactTo } as unknown as ConfigService<Env, true>
}

const EVENT = new SupportTicketOpenedIntegrationEvent(
    'ticket-1',
    'billing',
    'Charged twice',
    'user@example.com',
    'Ada',
    'user-1',
    'I was billed twice.',
)

describe('NotifyAdminOnTicketOpened', () => {
    let mailer: FakeMailer
    beforeEach(() => {
        mailer = new FakeMailer()
    })

    it('emails the support inbox with reply-to set to the sender', async () => {
        const handler = new NotifyAdminOnTicketOpened(mailer, config('support@team.com'), silentLogger())

        await handler.handle(EVENT)

        expect(mailer.sent).toHaveLength(1)
        expect(mailer.last()).toMatchObject({
            to: 'support@team.com',
            replyTo: 'user@example.com',
            tag: 'contact',
        })
        expect(mailer.last()?.subject).toContain('Charged twice')
        // The body carries the message and the linked account, escaped.
        expect(mailer.last()?.text).toContain('I was billed twice.')
        expect(mailer.last()?.html).toContain('user-1')
    })

    it('skips the email when CONTACT_TO is unset', async () => {
        const handler = new NotifyAdminOnTicketOpened(mailer, config(''), silentLogger())

        await handler.handle(EVENT)

        expect(mailer.sent).toHaveLength(0)
    })

    it('swallows a mail transport failure (best-effort — the ticket is already stored)', async () => {
        class ThrowingMailer extends Mailer {
            async send(_message: EmailMessage): Promise<string | undefined> {
                throw new Error('resend down')
            }
        }
        const handler = new NotifyAdminOnTicketOpened(new ThrowingMailer(), config('support@team.com'), silentLogger())

        await expect(handler.handle(EVENT)).resolves.toBeUndefined()
    })
})
