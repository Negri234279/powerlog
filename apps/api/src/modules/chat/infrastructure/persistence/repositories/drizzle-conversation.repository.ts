import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { ConversationEntity } from '../../../domain/entities/conversation.entity'
import { ConversationRepository } from '../../../domain/repositories/conversation.repository'
import { ConversationMapper } from '../mappers/conversation.mapper'
import { chatConversations } from '../schema/chat-conversations.schema'

@Injectable()
export class DrizzleConversationRepository extends ConversationRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findById(id: string): Promise<ConversationEntity | null> {
        const [row] = await this.db.select().from(chatConversations).where(eq(chatConversations.id, id)).limit(1)
        return row ? ConversationMapper.toDomain(row) : null
    }

    async findByPair(coachId: string, athleteId: string): Promise<ConversationEntity | null> {
        const [row] = await this.db
            .select()
            .from(chatConversations)
            .where(and(eq(chatConversations.coachId, coachId), eq(chatConversations.athleteId, athleteId)))
            .limit(1)
        return row ? ConversationMapper.toDomain(row) : null
    }

    async createIfAbsent(conversation: ConversationEntity): Promise<ConversationEntity> {
        // The unique (coach_id, athlete_id) makes this idempotent: a concurrent
        // create (or the migration backfill) simply conflicts and is ignored.
        await this.db
            .insert(chatConversations)
            .values(ConversationMapper.toPersistence(conversation))
            .onConflictDoNothing({
                target: [chatConversations.coachId, chatConversations.athleteId],
            })

        const live = await this.findByPair(conversation.coachId, conversation.athleteId)
        // The row exists now (we just inserted or it was already there).
        return live ?? conversation
    }
}
