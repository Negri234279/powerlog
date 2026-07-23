import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AdminSupportFilter,
    type AdminSupportPage,
    AdminSupportReadModel,
    type AdminSupportRow,
} from '../../../application/ports/admin-support.read-model'
import { supportTicketMessages } from '../schema/support-ticket-messages.schema'
import { supportTickets } from '../schema/support-tickets.schema'

/**
 * The admin ticket inbox. Reads only support's own tables — who the requester IS
 * (their handle) gets resolved by the handler through `UserDirectory`. The message
 * count comes from a LEFT JOIN grouped by the ticket id (its PK), newest activity
 * first.
 */
@Injectable()
export class DrizzleAdminSupportReadModel extends AdminSupportReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(filter: AdminSupportFilter, page: { limit: number; offset: number }): Promise<AdminSupportPage> {
        const where = and(
            filter.status ? eq(supportTickets.status, filter.status) : undefined,
            filter.category ? eq(supportTickets.category, filter.category) : undefined,
            filter.userId ? eq(supportTickets.requesterUserId, filter.userId) : undefined,
        )

        const rows = await this.db
            .select({
                id: supportTickets.id,
                category: supportTickets.category,
                subject: supportTickets.subject,
                status: supportTickets.status,
                requesterEmail: supportTickets.requesterEmail,
                requesterName: supportTickets.requesterName,
                requesterUserId: supportTickets.requesterUserId,
                messageCount: count(supportTicketMessages.id),
                createdAt: supportTickets.createdAt,
                lastMessageAt: supportTickets.lastMessageAt,
            })
            .from(supportTickets)
            .leftJoin(supportTicketMessages, eq(supportTicketMessages.ticketId, supportTickets.id))
            .where(where)
            .groupBy(supportTickets.id)
            .orderBy(desc(supportTickets.lastMessageAt), desc(supportTickets.id))
            .limit(page.limit)
            .offset(page.offset)

        const [total] = await this.db.select({ value: count() }).from(supportTickets).where(where)

        return {
            rows: rows as AdminSupportRow[],
            total: Number(total?.value ?? 0),
        }
    }
}
