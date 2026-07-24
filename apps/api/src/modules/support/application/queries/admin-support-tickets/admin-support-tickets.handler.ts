import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import type { AdminSupportRow } from '../../ports/admin-support.read-model'
import { AdminSupportReadModel } from '../../ports/admin-support.read-model'
import { AdminSupportTicketsQuery } from './admin-support-tickets.query'

/** A list row plus the requester's handle when the ticket is linked to an account. */
export interface AdminSupportTicketView extends AdminSupportRow {
    requesterUsername: string | null
}

export interface AdminSupportTicketsPageView {
    rows: AdminSupportTicketView[]
    total: number
    limit: number
    offset: number
}

const EMPTY = (limit: number, offset: number): AdminSupportTicketsPageView => ({ rows: [], total: 0, limit, offset })

@QueryHandler(AdminSupportTicketsQuery)
export class AdminSupportTicketsHandler implements IQueryHandler<
    AdminSupportTicketsQuery,
    AdminSupportTicketsPageView
> {
    constructor(
        private readonly readModel: AdminSupportReadModel,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: AdminSupportTicketsQuery): Promise<AdminSupportTicketsPageView> {
        const { search, ...filter } = query.filter

        // The requester's identity lives in auth; a search is resolved to a user id
        // first (exact email or handle). A search matching nobody has no results —
        // it must not silently widen into "every ticket".
        let userId: string | undefined
        if (search) {
            const term = search.trim()
            userId =
                (await this.users.findUserIdByEmail(term)) ?? (await this.users.findUserIdByUsername(term)) ?? undefined
            if (!userId) return EMPTY(query.limit, query.offset)
        }

        const page = await this.readModel.list(
            { ...filter, ...(userId ? { userId } : {}) },
            { limit: query.limit, offset: query.offset },
        )

        // Per row, bounded by the page size — resolve the linked account's handle so
        // the admin can click through. Unlinked tickets stand on their email alone.
        const rows = await Promise.all(
            page.rows.map(async (row) => {
                const contact = row.requesterUserId
                    ? await this.users.getContact(row.requesterUserId).catch(() => null)
                    : null

                return { ...row, requesterUsername: contact?.username ?? null }
            }),
        )

        return { rows, total: page.total, limit: query.limit, offset: query.offset }
    }
}
