import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import type { AdminSubscriptionRow } from '../../ports/admin-subscription.read-model'
import { AdminSubscriptionReadModel } from '../../ports/admin-subscription.read-model'
import { AdminSubscriptionsQuery } from './admin-subscriptions.query'

/** A row of the admin list: the subscription plus who it belongs to. */
export interface AdminSubscriptionView extends AdminSubscriptionRow {
    email: string | null
    username: string | null
}

export interface AdminSubscriptionsPageView {
    rows: AdminSubscriptionView[]
    total: number
    limit: number
    offset: number
}

const EMPTY = (limit: number, offset: number): AdminSubscriptionsPageView => ({
    rows: [],
    total: 0,
    limit,
    offset,
})

@QueryHandler(AdminSubscriptionsQuery)
export class AdminSubscriptionsHandler implements IQueryHandler<AdminSubscriptionsQuery, AdminSubscriptionsPageView> {
    constructor(
        private readonly readModel: AdminSubscriptionReadModel,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: AdminSubscriptionsQuery): Promise<AdminSubscriptionsPageView> {
        const { search, ...filter } = query.filter

        // The subscriber's identity lives in auth, which billing cannot join to, so
        // a search is resolved to a user id first (exact email or handle).
        let userId: string | undefined
        if (search) {
            const term = search.trim()
            userId =
                (await this.users.findUserIdByEmail(term)) ?? (await this.users.findUserIdByUsername(term)) ?? undefined

            // A search that matches nobody has no results — it must not silently
            // widen into "every subscription".
            if (!userId) return EMPTY(query.limit, query.offset)
        }

        const page = await this.readModel.list(
            { ...filter, ...(userId ? { userId } : {}) },
            { limit: query.limit, offset: query.offset },
        )

        // Per row, bounded by the page size — same as the admin user listing. A user
        // who is gone (or half-provisioned) leaves nulls instead of failing the page.
        const rows = await Promise.all(
            page.rows.map(async (row) => {
                const contact = await this.users.getContact(row.userId).catch(() => null)

                return {
                    ...row,
                    email: contact?.email ?? null,
                    username: contact?.username ?? null,
                }
            }),
        )

        return {
            rows,
            total: page.total,
            limit: query.limit,
            offset: query.offset,
        }
    }
}
