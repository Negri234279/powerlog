import type { TicketCategory } from '../../domain/ticket-category'
import type { TicketStatus } from '../../domain/ticket-status'

/**
 * Filters for the admin ticket list. All optional, all AND-ed; `statuses` and
 * `categories` are OR-within / AND-across (a row matches if its status is in the
 * set AND its category is in the set). An empty/absent set means "any". There is no
 * free-text filter here: the requester's identity lives in auth (only a soft
 * `requester_user_id` is stored), so the handler resolves a search term to a
 * `userId` through `UserDirectory` first and the SQL stays in support's tables.
 */
export interface AdminSupportFilter {
    statuses?: TicketStatus[]
    categories?: TicketCategory[]
    userId?: string
}

/** One row of the admin inbox — who the requester IS gets enriched by the handler. */
export interface AdminSupportRow {
    id: string
    category: TicketCategory
    subject: string
    status: TicketStatus
    requesterEmail: string
    requesterName: string | null
    requesterUserId: string | null
    messageCount: number
    createdAt: Date
    lastMessageAt: Date
}

export interface AdminSupportPage {
    rows: AdminSupportRow[]
    total: number
}

export abstract class AdminSupportReadModel {
    abstract list(filter: AdminSupportFilter, page: { limit: number; offset: number }): Promise<AdminSupportPage>
}
