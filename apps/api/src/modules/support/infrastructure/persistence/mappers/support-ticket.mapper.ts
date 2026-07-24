import { SupportMessageEntity } from '../../../domain/entities/support-message.entity'
import { SupportTicketEntity } from '../../../domain/entities/support-ticket.entity'
import type { TicketCategory } from '../../../domain/ticket-category'
import type { TicketStatus } from '../../../domain/ticket-status'
import type { MessageDirection } from '../../../domain/message-direction'
import { supportTicketMessages } from '../schema/support-ticket-messages.schema'
import { supportTickets } from '../schema/support-tickets.schema'

type TicketRow = typeof supportTickets.$inferSelect
type TicketInsert = typeof supportTickets.$inferInsert
type MessageRow = typeof supportTicketMessages.$inferSelect
type MessageInsert = typeof supportTicketMessages.$inferInsert

/** Maps a `SupportTicketEntity` (+ its thread) to/from the two tables. */
export const SupportTicketMapper = {
    toPersistence(ticket: SupportTicketEntity): { ticket: TicketInsert; messages: MessageInsert[] } {
        return {
            ticket: {
                id: ticket.id,
                category: ticket.category,
                subject: ticket.subject,
                status: ticket.status,
                requesterEmail: ticket.requesterEmail,
                requesterName: ticket.requesterName,
                requesterUserId: ticket.requesterUserId,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                lastMessageAt: ticket.lastMessageAt,
            },
            messages: ticket.messages.map((message) => ({
                id: message.id,
                ticketId: message.ticketId,
                direction: message.direction,
                body: message.body,
                authorUserId: message.authorUserId,
                createdAt: message.createdAt,
            })),
        }
    },

    toDomain(row: TicketRow, messageRows: MessageRow[]): SupportTicketEntity {
        return SupportTicketEntity.rehydrate({
            id: row.id,
            category: row.category as TicketCategory,
            subject: row.subject,
            status: row.status as TicketStatus,
            requesterEmail: row.requesterEmail,
            requesterName: row.requesterName,
            requesterUserId: row.requesterUserId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            lastMessageAt: row.lastMessageAt,
            messages: messageRows.map((message) =>
                SupportMessageEntity.rehydrate({
                    id: message.id,
                    ticketId: message.ticketId,
                    direction: message.direction as MessageDirection,
                    body: message.body,
                    authorUserId: message.authorUserId,
                    createdAt: message.createdAt,
                }),
            ),
        })
    },
}
