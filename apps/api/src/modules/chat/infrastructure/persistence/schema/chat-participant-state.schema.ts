import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'

import { chatConversations } from './chat-conversations.schema'

/**
 * `chat_participant_state` — the read/delivery cursor per participant, keyed by
 * `(conversation_id, user_id)`. One row per participant, not per message: the
 * double-check of any message is derived by comparing it against these cursors.
 * `last_delivered_message_id`/`last_read_message_id` are SOFT references to
 * `chat_messages` (kept nullable; a fresh participant has read nothing).
 */
export const chatParticipantState = pgTable(
    'chat_participant_state',
    {
        conversationId: uuid('conversation_id')
            .notNull()
            .references(() => chatConversations.id, { onDelete: 'cascade' }),
        userId: uuid('user_id').notNull(),
        lastDeliveredMessageId: uuid('last_delivered_message_id'),
        lastReadMessageId: uuid('last_read_message_id'),
        lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    },
    (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
)
