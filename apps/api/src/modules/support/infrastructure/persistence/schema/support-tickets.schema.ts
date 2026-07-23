import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { TICKET_CATEGORIES } from '../../../domain/ticket-category'
import { TICKET_STATUSES } from '../../../domain/ticket-status'

/** Ticket category / status enums; values derive from the domain single source. */
export const ticketCategoryEnum = pgEnum('support_ticket_category', TICKET_CATEGORIES)
export const ticketStatusEnum = pgEnum('support_ticket_status', TICKET_STATUSES)

/**
 * `support_tickets` — contact/support tickets. `requester_user_id` is a SOFT
 * reference to the auth `users` (no cross-module FK): filled in when the sender's
 * email matches an account, null otherwise. `last_message_at` is the inbox sort key.
 */
export const supportTickets = pgTable(
    'support_tickets',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        category: ticketCategoryEnum('category').notNull(),
        subject: text('subject').notNull(),
        status: ticketStatusEnum('status').notNull().default('open'),
        requesterEmail: text('requester_email').notNull(),
        requesterName: text('requester_name'),
        requesterUserId: uuid('requester_user_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
        lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('support_tickets_status_idx').on(table.status),
        index('support_tickets_category_idx').on(table.category),
        index('support_tickets_requester_user_idx').on(table.requesterUserId),
        index('support_tickets_last_message_idx').on(table.lastMessageAt),
    ],
)
