import { beforeEach, describe, expect, it } from 'vitest'

import { FakeUserDirectory, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import {
    FakeClock,
    FakeIdGenerator,
    FakeSupportMetrics,
    InMemorySupportTicketRepository,
} from '../../../../../../tests/doubles/support'
import { SupportTicketOpenedIntegrationEvent } from '../../events/support-ticket-opened.integration-event'
import { SubmitContactMessageCommand } from './submit-contact-message.command'
import { SubmitContactMessageHandler } from './submit-contact-message.handler'

const USER = 'user-1'
const USER_EMAIL = 'user@example.com'

function setup() {
    const tickets = new InMemorySupportTicketRepository()
    const directory = new FakeUserDirectory().seed(USER, { email: USER_EMAIL, username: 'user1' })
    const metrics = new FakeSupportMetrics()
    const events = new RecordingEventBus()
    const handler = new SubmitContactMessageHandler(
        tickets,
        directory,
        new FakeClock(),
        new FakeIdGenerator(['ticket-1', 'msg-1']),
        metrics,
        events.asEventBus(),
    )
    return { handler, tickets, metrics, events }
}

function command(overrides: Partial<ConstructorParameters<typeof SubmitContactMessageCommand>> = []) {
    return new SubmitContactMessageCommand(
        overrides[0] ?? 'Ada',
        overrides[1] ?? USER_EMAIL,
        overrides[2] ?? 'billing',
        overrides[3] ?? 'Charged twice',
        overrides[4] ?? 'I was billed twice this month.',
    )
}

describe('SubmitContactMessageHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('opens a ticket linked to the account when the email is known', async () => {
        const id = await ctx.handler.execute(command())

        expect(id).toBe('ticket-1')
        const [ticket] = ctx.tickets.all()
        expect(ticket).toMatchObject({
            id: 'ticket-1',
            category: 'billing',
            subject: 'Charged twice',
            status: 'open',
            requesterEmail: USER_EMAIL,
            requesterName: 'Ada',
            requesterUserId: USER,
        })
        expect(ticket?.messages).toHaveLength(1)
        expect(ctx.metrics.opened).toEqual(['billing'])
    })

    it('opens an unlinked ticket when the email has no account', async () => {
        await ctx.handler.execute(command(['Stranger', 'nobody@example.com', 'general', 'Hi', 'Just a question here.']))

        const [ticket] = ctx.tickets.all()
        expect(ticket?.requesterUserId).toBeNull()
        expect(ticket?.requesterEmail).toBe('nobody@example.com')
    })

    it('normalizes the email (trim + lowercase) and still links it', async () => {
        await ctx.handler.execute(command(['Ada', '  User@Example.com  ', 'account', 'Access', 'I cannot log in now.']))

        const [ticket] = ctx.tickets.all()
        expect(ticket?.requesterEmail).toBe(USER_EMAIL)
        expect(ticket?.requesterUserId).toBe(USER)
    })

    it('publishes the opened event carrying the message and linkage', async () => {
        await ctx.handler.execute(command())

        const event = ctx.events.firstOf(SupportTicketOpenedIntegrationEvent)
        expect(event).toMatchObject({
            ticketId: 'ticket-1',
            category: 'billing',
            subject: 'Charged twice',
            requesterEmail: USER_EMAIL,
            requesterName: 'Ada',
            requesterUserId: USER,
            messageBody: 'I was billed twice this month.',
        })
    })
})
