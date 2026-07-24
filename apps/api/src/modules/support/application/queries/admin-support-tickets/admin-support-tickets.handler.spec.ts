import { beforeEach, describe, expect, it } from 'vitest'

import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { FakeAdminSupportReadModel } from '../../../../../../tests/doubles/support'
import type { AdminSupportRow } from '../../ports/admin-support.read-model'
import { AdminSupportTicketsHandler } from './admin-support-tickets.handler'
import { AdminSupportTicketsQuery } from './admin-support-tickets.query'

const USER = 'user-1'

function row(overrides: Partial<AdminSupportRow> = {}): AdminSupportRow {
    return {
        id: 'ticket-1',
        category: 'billing',
        subject: 'Charged twice',
        status: 'open',
        requesterEmail: 'user@example.com',
        requesterName: 'Ada',
        requesterUserId: USER,
        messageCount: 1,
        createdAt: new Date('2026-07-23T10:00:00.000Z'),
        lastMessageAt: new Date('2026-07-23T10:00:00.000Z'),
        ...overrides,
    }
}

function setup(rows: AdminSupportRow[]) {
    const readModel = new FakeAdminSupportReadModel(rows)
    const directory = new FakeUserDirectory().seed(USER, { email: 'user@example.com', username: 'ada' })
    const handler = new AdminSupportTicketsHandler(readModel, directory)
    return { handler }
}

describe('AdminSupportTicketsHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup([row(), row({ id: 'ticket-2', requesterUserId: null, requesterEmail: 'x@y.com' })])
    })

    it('enriches a linked ticket with the account handle and leaves unlinked ones null', async () => {
        const page = await ctx.handler.execute(new AdminSupportTicketsQuery({}, 50, 0))

        expect(page.total).toBe(2)
        expect(page.rows[0]).toMatchObject({ id: 'ticket-1', requesterUsername: 'ada' })
        expect(page.rows[1]).toMatchObject({ id: 'ticket-2', requesterUsername: null })
    })

    it('filters by a set of statuses', async () => {
        const open = row({ id: 'open-1', status: 'open' })
        const closed = row({ id: 'closed-1', status: 'closed' })
        const { handler } = setup([open, closed])

        const page = await handler.execute(new AdminSupportTicketsQuery({ statuses: ['open'] }, 50, 0))

        expect(page.rows).toHaveLength(1)
        expect(page.rows[0]?.id).toBe('open-1')
    })

    it('resolves a search term to a userId and filters by it', async () => {
        const page = await ctx.handler.execute(new AdminSupportTicketsQuery({ search: 'user@example.com' }, 50, 0))

        expect(page.rows).toHaveLength(1)
        expect(page.rows[0]?.id).toBe('ticket-1')
    })

    it('returns empty when the search matches nobody (never widens to all)', async () => {
        const page = await ctx.handler.execute(new AdminSupportTicketsQuery({ search: 'ghost@nowhere.com' }, 50, 0))

        expect(page).toMatchObject({ rows: [], total: 0 })
    })
})
