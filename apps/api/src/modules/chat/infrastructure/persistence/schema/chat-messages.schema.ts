import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { MESSAGE_KINDS } from '../../../domain/message-kind'
import { chatConversations } from './chat-conversations.schema'

/** Message kinds; values derive from the domain single source of truth. */
export const chatMessageKindEnum = pgEnum('chat_message_kind', MESSAGE_KINDS)

/**
 * `chat_messages` — one row per message. `sender_id` is a SOFT reference to the
 * auth user. `kind` is an enum from day one (`text` only in v1). The
 * `attachment_*` columns are reserved (nullable, unused in v1) so adding
 * files/images later is an additive migration, not a table rewrite. The
 * `(conversation_id, created_at, id)` index backs the keyset cursor.
 */
export const chatMessages = pgTable(
    'chat_messages',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        conversationId: uuid('conversation_id')
            .notNull()
            .references(() => chatConversations.id, { onDelete: 'cascade' }),
        senderId: uuid('sender_id').notNull(),
        kind: chatMessageKindEnum('kind').notNull().default('text'),
        body: text('body').notNull(),
        // Reserved for files/images (Chat: out of scope for this phase). Unused in v1.
        attachmentUrl: text('attachment_url'),
        attachmentMime: text('attachment_mime'),
        attachmentSize: integer('attachment_size'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('chat_messages_cursor_idx').on(t.conversationId, t.createdAt, t.id)],
)
