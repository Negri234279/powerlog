import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import type { MessageDirection } from '../../../domain/message-direction'
import type { TicketCategory } from '../../../domain/ticket-category'
import type { TicketStatus } from '../../../domain/ticket-status'
import { SupportTicketRepository } from '../../../domain/repositories/support-ticket.repository'
import { AdminSupportTicketQuery } from './admin-support-ticket.query'

export interface AdminSupportMessageView {
    id: string
    direction: MessageDirection
    body: string
    authorUserId: string | null
    createdAt: Date
}

/** A ticket and its full thread, for the admin detail page. */
export interface AdminSupportTicketDetailView {
    id: string
    category: TicketCategory
    subject: string
    status: TicketStatus
    requesterEmail: string
    requesterName: string | null
    requesterUserId: string | null
    requesterUsername: string | null
    createdAt: Date
    updatedAt: Date
    lastMessageAt: Date
    messages: AdminSupportMessageView[]
}

@QueryHandler(AdminSupportTicketQuery)
export class AdminSupportTicketHandler implements IQueryHandler<
    AdminSupportTicketQuery,
    AdminSupportTicketDetailView | null
> {
    constructor(
        private readonly tickets: SupportTicketRepository,
        private readonly users: UserDirectory,
    ) {}

    async execute(query: AdminSupportTicketQuery): Promise<AdminSupportTicketDetailView | null> {
        const ticket = await this.tickets.findById(query.id)
        if (!ticket) return null

        const contact = ticket.requesterUserId
            ? await this.users.getContact(ticket.requesterUserId).catch(() => null)
            : null

        return {
            id: ticket.id,
            category: ticket.category,
            subject: ticket.subject,
            status: ticket.status,
            requesterEmail: ticket.requesterEmail,
            requesterName: ticket.requesterName,
            requesterUserId: ticket.requesterUserId,
            requesterUsername: contact?.username ?? null,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            lastMessageAt: ticket.lastMessageAt,
            messages: ticket.messages.map((message) => ({
                id: message.id,
                direction: message.direction,
                body: message.body,
                authorUserId: message.authorUserId,
                createdAt: message.createdAt,
            })),
        }
    }
}
