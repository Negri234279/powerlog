import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { MessageEntity } from '../../../domain/entities/message.entity'
import {
    type MessageListFilter,
    type MessageSlice,
    MessageRepository,
} from '../../../domain/repositories/message.repository'
import { MessageMapper } from '../mappers/message.mapper'
import { chatMessages } from '../schema/chat-messages.schema'

@Injectable()
export class DrizzleMessageRepository extends MessageRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async create(message: MessageEntity): Promise<void> {
        await this.db.insert(chatMessages).values(MessageMapper.toPersistence(message))
    }

    async list(filter: MessageListFilter): Promise<MessageSlice> {
        const conditions = [eq(chatMessages.conversationId, filter.conversationId)]
        if (filter.cursor) {
            // Keyset: rows strictly "after" the cursor under (createdAt, id) DESC.
            conditions.push(
                sql`(${chatMessages.createdAt}, ${chatMessages.id}) < (${filter.cursor.createdAt.toISOString()}::timestamptz, ${filter.cursor.id}::uuid)`,
            )
        }

        const rows = await this.db
            .select()
            .from(chatMessages)
            .where(and(...conditions))
            .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
            .limit(filter.limit + 1)

        const hasNextPage = rows.length > filter.limit
        const page = hasNextPage ? rows.slice(0, filter.limit) : rows
        return { hasNextPage, items: page.map(MessageMapper.toDomain) }
    }

    async latest(conversationId: string): Promise<MessageEntity | null> {
        const [row] = await this.db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.conversationId, conversationId))
            .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
            .limit(1)
            
        return row ? MessageMapper.toDomain(row) : null
    }
}
