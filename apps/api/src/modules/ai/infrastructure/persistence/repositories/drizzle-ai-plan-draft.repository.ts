import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { AiPlanDraftAggregate } from '../../../domain/entities/ai-plan-draft.entity'
import { AiPlanDraftRepository } from '../../../domain/repositories/ai-plan-draft.repository'
import { AiPlanDraftMapper } from '../mappers/ai-plan-draft.mapper'
import { aiPlanDraftMessages, aiPlanDrafts, aiPlanDraftSets } from '../schema/ai-plan-drafts.schema'

@Injectable()
export class DrizzleAiPlanDraftRepository extends AiPlanDraftRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findById(id: string): Promise<AiPlanDraftAggregate | null> {
        const [draft] = await this.db.select().from(aiPlanDrafts).where(eq(aiPlanDrafts.id, id)).limit(1)

        return draft ? this.hydrate(draft) : null
    }

    async findOpenBySession(userId: string, sessionId: string): Promise<AiPlanDraftAggregate | null> {
        const [draft] = await this.db
            .select()
            .from(aiPlanDrafts)
            .where(
                and(
                    eq(aiPlanDrafts.userId, userId),
                    eq(aiPlanDrafts.sessionId, sessionId),
                    eq(aiPlanDrafts.status, 'open'),
                ),
            )
            .limit(1)

        return draft ? this.hydrate(draft) : null
    }

    /**
     * The sets and messages belong to the draft, so they are written with it. The
     * sets are replaced wholesale — a revision proposes a different plan, not a
     * patch of the old one — while messages are append-only, so already-stored
     * ones are left untouched.
     */
    async save(draft: AiPlanDraftAggregate): Promise<void> {
        const row = AiPlanDraftMapper.toPersistence(draft)

        await this.db.transaction(async (tx) => {
            await tx
                .insert(aiPlanDrafts)
                .values(row)
                .onConflictDoUpdate({
                    target: aiPlanDrafts.id,
                    set: { status: row.status, model: row.model, updatedAt: row.updatedAt },
                })

            await tx.delete(aiPlanDraftSets).where(eq(aiPlanDraftSets.draftId, draft.id))
            const sets = AiPlanDraftMapper.setsToPersistence(draft)
            if (sets.length > 0) await tx.insert(aiPlanDraftSets).values(sets)

            const messages = AiPlanDraftMapper.messagesToPersistence(draft)
            if (messages.length > 0) await tx.insert(aiPlanDraftMessages).values(messages).onConflictDoNothing()
        })
    }

    async deleteAllByUser(userId: string): Promise<void> {
        // Sets and messages cascade from the draft.
        await this.db.delete(aiPlanDrafts).where(eq(aiPlanDrafts.userId, userId))
    }

    private async hydrate(draft: typeof aiPlanDrafts.$inferSelect): Promise<AiPlanDraftAggregate> {
        const [sets, messages] = await Promise.all([
            this.db
                .select()
                .from(aiPlanDraftSets)
                .where(eq(aiPlanDraftSets.draftId, draft.id))
                .orderBy(asc(aiPlanDraftSets.entryId), asc(aiPlanDraftSets.order)),
            this.db
                .select()
                .from(aiPlanDraftMessages)
                .where(eq(aiPlanDraftMessages.draftId, draft.id))
                .orderBy(asc(aiPlanDraftMessages.position)),
        ])

        return AiPlanDraftMapper.toDomain(draft, sets, messages)
    }
}
