import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemorySupportTicketRepository } from '../../../../../../tests/doubles/support'
import { SupportTicketEntity } from '../../../domain/entities/support-ticket.entity'
import { TicketNotFoundError } from '../../../domain/errors/support.errors'
import { SetTicketStatusCommand } from './set-ticket-status.command'
import { SetTicketStatusHandler } from './set-ticket-status.handler'

const OPENED = new Date('2026-07-23T10:00:00.000Z')

function ticket() {
    return SupportTicketEntity.open({
        id: 'ticket-1',
        category: 'bug',
        subject: 'Broken chart',
        requesterEmail: 'user@example.com',
        requesterName: null,
        requesterUserId: null,
        message: { id: 'msg-1', body: 'The chart does not render.' },
        now: OPENED,
    })
}

function setup(seed = [ticket()]) {
    const tickets = new InMemorySupportTicketRepository(seed)
    const clock = new FakeClock(new Date('2026-07-24T09:00:00.000Z'))
    const handler = new SetTicketStatusHandler(tickets, clock)
    return { handler, tickets }
}

describe('SetTicketStatusHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('closes an open ticket', async () => {
        await ctx.handler.execute(new SetTicketStatusCommand('ticket-1', 'closed'))
        expect((await ctx.tickets.findById('ticket-1'))?.status).toBe('closed')
    })

    it('reopens a closed ticket', async () => {
        await ctx.handler.execute(new SetTicketStatusCommand('ticket-1', 'closed'))
        await ctx.handler.execute(new SetTicketStatusCommand('ticket-1', 'open'))
        expect((await ctx.tickets.findById('ticket-1'))?.status).toBe('open')
    })

    it('rejects an unknown ticket', async () => {
        await expect(ctx.handler.execute(new SetTicketStatusCommand('nope', 'closed'))).rejects.toBeInstanceOf(
            TicketNotFoundError,
        )
    })
})
