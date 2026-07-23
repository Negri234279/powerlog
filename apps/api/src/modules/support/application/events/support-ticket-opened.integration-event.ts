import type { TicketCategory } from '../../domain/ticket-category'

/**
 * Published when a contact/support ticket is opened. The ticket is already stored
 * (the DB is the source of truth); this drives the best-effort admin notification
 * email, and is the seam for future reactions (realtime "new ticket" to admins).
 * Carries enough to build the email without a second read.
 */
export class SupportTicketOpenedIntegrationEvent {
    constructor(
        readonly ticketId: string,
        readonly category: TicketCategory,
        readonly subject: string,
        readonly requesterEmail: string,
        readonly requesterName: string | null,
        readonly requesterUserId: string | null,
        readonly messageBody: string,
    ) {}
}
