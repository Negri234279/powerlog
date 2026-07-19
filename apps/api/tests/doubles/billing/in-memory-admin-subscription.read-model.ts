import {
    type AdminSubscriptionFilter,
    type AdminSubscriptionPage,
    AdminSubscriptionReadModel,
    type AdminSubscriptionRow,
} from '../../../src/modules/billing/application/ports/admin-subscription.read-model'

/**
 * In-memory AdminSubscriptionReadModel double. Seed it with rows; `list` applies
 * the same filters the Drizzle model does and paginates newest-first, matching
 * the real ordering.
 */
export class InMemoryAdminSubscriptionReadModel extends AdminSubscriptionReadModel {
    private readonly rows: AdminSubscriptionRow[] = []

    seed(...rows: AdminSubscriptionRow[]): this {
        this.rows.push(...rows)
        return this
    }

    async list(
        filter: AdminSubscriptionFilter,
        page: { limit: number; offset: number },
    ): Promise<AdminSubscriptionPage> {
        const matched = this.rows
            .filter((r) => (filter.userId ? r.userId === filter.userId : true))
            .filter((r) => (filter.status ? r.status === filter.status : true))
            .filter((r) => (filter.gateway ? r.gateway === filter.gateway : true))
            .filter((r) => (filter.planId ? r.planId === filter.planId : true))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        return {
            rows: matched.slice(page.offset, page.offset + page.limit),
            total: matched.length,
        }
    }
}
