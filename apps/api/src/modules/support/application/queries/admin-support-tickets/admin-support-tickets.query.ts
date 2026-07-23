import type { TicketCategory } from '../../../domain/ticket-category'
import type { TicketStatus } from '../../../domain/ticket-status'

export class AdminSupportTicketsQuery {
    constructor(
        readonly filter: {
            statuses?: TicketStatus[]
            categories?: TicketCategory[]
            /** Exact email or handle of the requester (resolved to a userId). */
            search?: string
        },
        readonly limit: number,
        readonly offset: number,
    ) {}
}
