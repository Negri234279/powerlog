import { Inject, Injectable } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { SupportTicketEntity } from '../../../domain/entities/support-ticket.entity'
import { SupportTicketRepository } from '../../../domain/repositories/support-ticket.repository'
import { SupportTicketMapper } from '../mappers/support-ticket.mapper'
import { supportTicketMessages } from '../schema/support-ticket-messages.schema'
import { supportTickets } from '../schema/support-tickets.schema'

@Injectable()
export class DrizzleSupportTicketRepository extends SupportTicketRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(ticket: SupportTicketEntity): Promise<void> {
        const { ticket: row, messages } = SupportTicketMapper.toPersistence(ticket)

        // The ticket and its new messages persist together — a ticket with no
        // message would render as an empty thread. Messages are insert-if-absent by
        // id, so re-saving an existing ticket only appends what's new.
        await this.db.transaction(async (tx) => {
            await tx
                .insert(supportTickets)
                .values(row)
                .onConflictDoUpdate({
                    target: supportTickets.id,
                    set: {
                        status: row.status,
                        subject: row.subject,
                        requesterUserId: row.requesterUserId,
                        updatedAt: row.updatedAt,
                        lastMessageAt: row.lastMessageAt,
                    },
                })

            if (messages.length > 0) {
                await tx.insert(supportTicketMessages).values(messages).onConflictDoNothing({
                    target: supportTicketMessages.id,
                })
            }
        })
    }

    async findById(id: string): Promise<SupportTicketEntity | null> {
        const [row] = await this.db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1)
        if (!row) return null

        const messages = await this.db
            .select()
            .from(supportTicketMessages)
            .where(eq(supportTicketMessages.ticketId, id))
            .orderBy(asc(supportTicketMessages.createdAt), asc(supportTicketMessages.id))

        return SupportTicketMapper.toDomain(row, messages)
    }
}
