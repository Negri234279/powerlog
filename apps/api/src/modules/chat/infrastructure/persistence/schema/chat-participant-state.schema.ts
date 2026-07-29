import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'

import { chatConversations } from './chat-conversations.schema'

/**
 * `chat_participant_state` — the read/delivery cursor per participant, keyed by
 * `(conversation_id, user_id)`. One row per participant, not per message: the
 * double-check of any message is derived by comparing it against these cursors.
 * `last_delivered_message_id`/`last_read_message_id` are SOFT references to
 * `chat_messages` (kept nullable; a fresh participant has read nothing).
 *
 * `cleared_at`/`hidden_at` are the per-user "clear/delete chat" watermarks
 * (WhatsApp-style, this user's view only — the counterpart keeps their history):
 *  - `cleared_at`: messages at/before it are hidden from this user (list + inbox
 *    preview + unread all filter `> cleared_at`).
 *  - `hidden_at`: the conversation is dropped from this user's inbox until a newer
 *    message arrives (delete = clear + hide, so it reappears showing only what's new).
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
        clearedAt: timestamp('cleared_at', { withTimezone: true }),
        hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    },
    (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
)
