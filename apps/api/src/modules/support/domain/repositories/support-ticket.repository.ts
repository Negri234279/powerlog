import type { SupportTicketEntity } from '../entities/support-ticket.entity'

/**
 * Persistence port for support tickets. `save` persists the ticket and any of its
 * messages not yet stored (upsert). Admin listing/detail read the data through a
 * separate read model, not this repository.
 */
export abstract class SupportTicketRepository {
    abstract save(ticket: SupportTicketEntity): Promise<void>
    abstract findById(id: string): Promise<SupportTicketEntity | null>
}
