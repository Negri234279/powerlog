import type { SupportTicketEntity } from '../../../src/modules/support/domain/entities/support-ticket.entity'
import { SupportTicketRepository } from '../../../src/modules/support/domain/repositories/support-ticket.repository'

/**
 * In-memory SupportTicketRepository implementing the real abstract interface.
 * Stores tickets by id; `save` upserts (the ticket carries its own thread).
 */
export class InMemorySupportTicketRepository extends SupportTicketRepository {
    private readonly byId = new Map<string, SupportTicketEntity>()

    constructor(seed: SupportTicketEntity[] = []) {
        super()
        for (const ticket of seed) this.byId.set(ticket.id, ticket)
    }

    async save(ticket: SupportTicketEntity): Promise<void> {
        this.byId.set(ticket.id, ticket)
    }

    async findById(id: string): Promise<SupportTicketEntity | null> {
        return this.byId.get(id) ?? null
    }

    /** Test inspection: every stored ticket. */
    all(): SupportTicketEntity[] {
        return [...this.byId.values()]
    }
}
