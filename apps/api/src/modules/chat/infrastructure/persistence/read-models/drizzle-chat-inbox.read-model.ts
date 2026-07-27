import { Inject, Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { ChatInboxReadModel, type ChatInboxRow } from '../../../application/ports/chat-inbox.read-model'

type InboxSqlRow = {
    conversation_id: string
    other_participant_id: string
    last_message_id: string | null
    last_sender_id: string | null
    last_body: string | null
    last_created_at: Date | null
    unread_count: number
}

@Injectable()
export class DrizzleChatInboxReadModel extends ChatInboxReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async listForUser(userId: string): Promise<ChatInboxRow[]> {
        // One grouped query: the other party, the last message (lateral top-1) and
        // the unread count (messages from the other party past this user's read
        // cursor) per conversation the user is in. Most recent activity first.
        const result = await this.db.execute<InboxSqlRow>(sql`
            SELECT
                c.id AS conversation_id,
                CASE WHEN c.coach_id = ${userId} THEN c.athlete_id ELSE c.coach_id END AS other_participant_id,
                lm.id AS last_message_id,
                lm.sender_id AS last_sender_id,
                lm.body AS last_body,
                lm.created_at AS last_created_at,
                (
                    SELECT count(*)::int
                    FROM chat_messages m
                    WHERE m.conversation_id = c.id
                      AND m.sender_id <> ${userId}
                      AND NOT EXISTS (
                        SELECT 1
                        FROM chat_participant_state ps
                        JOIN chat_messages rc ON rc.id = ps.last_read_message_id
                        WHERE ps.conversation_id = c.id
                          AND ps.user_id = ${userId}
                          AND (rc.created_at, rc.id) >= (m.created_at, m.id)
                      )
                ) AS unread_count
            FROM chat_conversations c
            LEFT JOIN LATERAL (
                SELECT id, sender_id, body, created_at
                FROM chat_messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) lm ON true
            WHERE c.coach_id = ${userId} OR c.athlete_id = ${userId}
            ORDER BY lm.created_at DESC NULLS LAST, c.created_at DESC
        `)

        return result.rows.map((row) => ({
            conversationId: row.conversation_id,
            otherParticipantId: row.other_participant_id,
            lastMessage:
                row.last_message_id && row.last_created_at
                    ? {
                          id: row.last_message_id,
                          senderId: row.last_sender_id!,
                          body: row.last_body!,
                          createdAt: new Date(row.last_created_at),
                      }
                    : null,
            unreadCount: row.unread_count,
        }))
    }
}
