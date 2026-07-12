import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, isNull } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { AiMesocycleDraftAggregate } from '../../../domain/entities/ai-mesocycle-draft.entity'
import { AiMesocycleDraftRepository } from '../../../domain/repositories/ai-mesocycle-draft.repository'
import { AiMesocycleDraftMapper } from '../mappers/ai-mesocycle-draft.mapper'
import { aiMesocycleDraftMessages, aiMesocycleDrafts } from '../schema/ai-mesocycle-drafts.schema'

@Injectable()
export class DrizzleAiMesocycleDraftRepository extends AiMesocycleDraftRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findById(id: string): Promise<AiMesocycleDraftAggregate | null> {
        const [draft] = await this.db.select().from(aiMesocycleDrafts).where(eq(aiMesocycleDrafts.id, id)).limit(1)

        return draft ? this.hydrate(draft) : null
    }

    async findOpenByUser(userId: string, athleteId: string | null): Promise<AiMesocycleDraftAggregate | null> {
        const [draft] = await this.db
            .select()
            .from(aiMesocycleDrafts)
            .where(
                and(
                    eq(aiMesocycleDrafts.userId, userId),
                    // `eq(col, null)` would render `= NULL`, which matches nothing.
                    athleteId === null
                        ? isNull(aiMesocycleDrafts.athleteId)
                        : eq(aiMesocycleDrafts.athleteId, athleteId),
                    eq(aiMesocycleDrafts.status, 'open'),
                ),
            )
            .limit(1)

        return draft ? this.hydrate(draft) : null
    }

    /**
     * The proposed week and the messages belong to the draft, so they are written
     * with it. The week is replaced wholesale — a revision proposes a different
     * week, not a patch of the old one — while messages are append-only, so
     * already-stored ones are left untouched.
     */
    async save(draft: AiMesocycleDraftAggregate): Promise<void> {
        const row = AiMesocycleDraftMapper.toPersistence(draft)

        await this.db.transaction(async (tx) => {
            await tx
                .insert(aiMesocycleDrafts)
                .values(row)
                .onConflictDoUpdate({
                    target: aiMesocycleDrafts.id,
                    set: { status: row.status, model: row.model, content: row.content, updatedAt: row.updatedAt },
                })

            const messages = AiMesocycleDraftMapper.messagesToPersistence(draft)
            if (messages.length > 0) await tx.insert(aiMesocycleDraftMessages).values(messages).onConflictDoNothing()
        })
    }

    async deleteAllByUser(userId: string): Promise<void> {
        // Messages cascade from the draft.
        await this.db.delete(aiMesocycleDrafts).where(eq(aiMesocycleDrafts.userId, userId))
    }

    private async hydrate(draft: typeof aiMesocycleDrafts.$inferSelect): Promise<AiMesocycleDraftAggregate> {
        const messages = await this.db
            .select()
            .from(aiMesocycleDraftMessages)
            .where(eq(aiMesocycleDraftMessages.draftId, draft.id))
            .orderBy(asc(aiMesocycleDraftMessages.position))

        return AiMesocycleDraftMapper.toDomain(draft, messages)
    }
}
