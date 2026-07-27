import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { ParticipantStateEntity } from '../../../domain/entities/participant-state.entity'
import { ParticipantStateRepository } from '../../../domain/repositories/participant-state.repository'
import type { ReceiverCursor } from '../../../domain/read-status'
import { ParticipantStateMapper } from '../mappers/participant-state.mapper'
import { chatParticipantState } from '../schema/chat-participant-state.schema'

@Injectable()
export class DrizzleParticipantStateRepository extends ParticipantStateRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async get(conversationId: string, userId: string): Promise<ParticipantStateEntity | null> {
        const [row] = await this.db
            .select()
            .from(chatParticipantState)
            .where(
                and(eq(chatParticipantState.conversationId, conversationId), eq(chatParticipantState.userId, userId)),
            )
            .limit(1)

        return row ? ParticipantStateMapper.toDomain(row) : null
    }

    async upsert(state: ParticipantStateEntity): Promise<void> {
        const row = ParticipantStateMapper.toPersistence(state)

        await this.db
            .insert(chatParticipantState)
            .values(row)
            .onConflictDoUpdate({
                target: [chatParticipantState.conversationId, chatParticipantState.userId],
                set: {
                    lastDeliveredMessageId: row.lastDeliveredMessageId,
                    lastReadMessageId: row.lastReadMessageId,
                    lastReadAt: row.lastReadAt,
                },
            })
    }

    async countUnread(conversationId: string, userId: string): Promise<number> {
        // Messages from the other participant with no read cursor at or past them.
        const result = await this.db.execute<{ count: number }>(sql`
            SELECT count(*)::int AS count
            FROM chat_messages m
            WHERE m.conversation_id = ${conversationId}
              AND m.sender_id <> ${userId}
              AND NOT EXISTS (
                SELECT 1
                FROM chat_participant_state ps
                JOIN chat_messages rc ON rc.id = ps.last_read_message_id
                WHERE ps.conversation_id = m.conversation_id
                  AND ps.user_id = ${userId}
                  AND (rc.created_at, rc.id) >= (m.created_at, m.id)
              )
        `)

        return result.rows[0]?.count ?? 0
    }

    async receiverCursor(conversationId: string, userId: string): Promise<ReceiverCursor> {
        // Resolve the delivered/read cursor ids to their (createdAt, id) keys so
        // the sender's double-check can be derived against them.
        const result = await this.db.execute<{
            delivered_created_at: Date | null
            delivered_id: string | null
            read_created_at: Date | null
            read_id: string | null
        }>(sql`
            SELECT d.created_at AS delivered_created_at, d.id AS delivered_id,
                   r.created_at AS read_created_at, r.id AS read_id
            FROM chat_participant_state ps
            LEFT JOIN chat_messages d ON d.id = ps.last_delivered_message_id
            LEFT JOIN chat_messages r ON r.id = ps.last_read_message_id
            WHERE ps.conversation_id = ${conversationId} AND ps.user_id = ${userId}
        `)

        const row = result.rows[0]
        if (!row)
            return {
                delivered: null,
                read: null,
            }

        return {
            delivered:
                row.delivered_id && row.delivered_created_at
                    ? { createdAt: new Date(row.delivered_created_at), id: row.delivered_id }
                    : null,
            read:
                row.read_id && row.read_created_at
                    ? { createdAt: new Date(row.read_created_at), id: row.read_id }
                    : null,
        }
    }
}
