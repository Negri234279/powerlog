import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { MESSAGE_DIRECTIONS } from '../../../domain/message-direction'
import { supportTickets } from './support-tickets.schema'

/** Message direction; values derive from the domain single source of truth. */
export const messageDirectionEnum = pgEnum('support_message_direction', MESSAGE_DIRECTIONS)

/**
 * `support_ticket_messages` — the thread of a ticket. `ticket_id` is a real FK
 * within the module (cascade-deletes with its ticket). `author_user_id` is a soft
 * reference to the staff member on an outbound reply; null for inbound messages.
 */
export const supportTicketMessages = pgTable(
    'support_ticket_messages',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        ticketId: uuid('ticket_id')
            .notNull()
            .references(() => supportTickets.id, { onDelete: 'cascade' }),
        direction: messageDirectionEnum('direction').notNull(),
        body: text('body').notNull(),
        authorUserId: uuid('author_user_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index('support_ticket_messages_ticket_idx').on(table.ticketId)],
)
