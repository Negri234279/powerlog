import { describe, expect, it } from 'vitest'

import { SupportTicketEntity } from './support-ticket.entity'

const NOW = new Date('2026-07-23T10:00:00.000Z')

function open() {
    return SupportTicketEntity.open({
        id: 'ticket-1',
        category: 'billing',
        subject: 'Charged twice',
        requesterEmail: 'user@example.com',
        requesterName: 'Ada',
        requesterUserId: 'user-1',
        message: { id: 'msg-1', body: 'I was billed twice this month.' },
        now: NOW,
    })
}

describe('SupportTicketEntity', () => {
    it('opens with status open and a single inbound message', () => {
        const ticket = open()

        expect(ticket.status).toBe('open')
        expect(ticket.category).toBe('billing')
        expect(ticket.requesterUserId).toBe('user-1')
        expect(ticket.createdAt).toEqual(NOW)
        expect(ticket.lastMessageAt).toEqual(NOW)

        expect(ticket.messages).toHaveLength(1)
        const [message] = ticket.messages
        expect(message).toMatchObject({
            id: 'msg-1',
            ticketId: 'ticket-1',
            direction: 'inbound',
            body: 'I was billed twice this month.',
            authorUserId: null,
        })
    })

    it('keeps requesterUserId null when the sender has no account', () => {
        const ticket = SupportTicketEntity.open({
            id: 'ticket-2',
            category: 'general',
            subject: 'Question',
            requesterEmail: 'stranger@example.com',
            requesterName: null,
            requesterUserId: null,
            message: { id: 'msg-2', body: 'Just wondering something.' },
            now: NOW,
        })

        expect(ticket.requesterUserId).toBeNull()
        expect(ticket.requesterName).toBeNull()
    })

    it('closes and reopens, bumping updatedAt', () => {
        const ticket = open()
        const later = new Date('2026-07-24T09:00:00.000Z')

        ticket.close(later)
        expect(ticket.status).toBe('closed')
        expect(ticket.updatedAt).toEqual(later)

        const evenLater = new Date('2026-07-25T09:00:00.000Z')
        ticket.reopen(evenLater)
        expect(ticket.status).toBe('open')
        expect(ticket.updatedAt).toEqual(evenLater)
    })
})
