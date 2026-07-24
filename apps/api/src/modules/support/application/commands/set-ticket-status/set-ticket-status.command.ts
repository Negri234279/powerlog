import type { TicketStatus } from '../../../domain/ticket-status'

/** Admin action: close or reopen a support ticket. */
export class SetTicketStatusCommand {
    constructor(
        readonly ticketId: string,
        readonly status: TicketStatus,
    ) {}
}
