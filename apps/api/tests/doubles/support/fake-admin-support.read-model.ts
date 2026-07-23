import {
    type AdminSupportFilter,
    type AdminSupportPage,
    AdminSupportReadModel,
    type AdminSupportRow,
} from '../../../src/modules/support/application/ports/admin-support.read-model'

/**
 * In-memory AdminSupportReadModel implementing the real abstract interface. Seed it
 * with rows; `list` applies the status/category/userId filter and paginates, so the
 * handler's enrichment and search-resolution can be asserted without SQL.
 */
export class FakeAdminSupportReadModel extends AdminSupportReadModel {
    constructor(private readonly rows: AdminSupportRow[] = []) {
        super()
    }

    async list(filter: AdminSupportFilter, page: { limit: number; offset: number }): Promise<AdminSupportPage> {
        const matched = this.rows.filter(
            (row) =>
                (!filter.status || row.status === filter.status) &&
                (!filter.category || row.category === filter.category) &&
                (!filter.userId || row.requesterUserId === filter.userId),
        )

        return {
            rows: matched.slice(page.offset, page.offset + page.limit),
            total: matched.length,
        }
    }
}
