import { AiMesocycleDraftAggregate } from '../../../domain/entities/ai-mesocycle-draft.entity'
import { AiPlanMessageEntity } from '../../../domain/entities/ai-plan-message.entity'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { PlanDraftStatusVO } from '../../../domain/value-objects/plan-draft-status.vo'
import type { aiMesocycleDraftMessages, aiMesocycleDrafts } from '../schema/ai-mesocycle-drafts.schema'

type DraftRow = typeof aiMesocycleDrafts.$inferSelect
type MessageRow = typeof aiMesocycleDraftMessages.$inferSelect

export const AiMesocycleDraftMapper = {
    /**
     * `content` is jsonb, so its shape is whatever was last written there — the
     * column type is a compile-time claim, not a runtime one. `rehydrate` re-asserts
     * the aggregate's invariants over it rather than trusting the cast.
     */
    toDomain(draft: DraftRow, messages: MessageRow[]): AiMesocycleDraftAggregate {
        return AiMesocycleDraftAggregate.rehydrate({
            id: draft.id,
            userId: draft.userId,
            athleteId: draft.athleteId,
            provider: AiProviderVO.create(draft.provider),
            model: draft.model,
            status: PlanDraftStatusVO.create(draft.status),
            weeks: draft.weeks,
            trainingDays: draft.trainingDays,
            goal: draft.goal,
            proposal: draft.content,
            messages: messages.map((message) =>
                AiPlanMessageEntity.create({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                }),
            ),
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
        })
    },

    toPersistence(draft: AiMesocycleDraftAggregate): typeof aiMesocycleDrafts.$inferInsert {
        return {
            id: draft.id,
            userId: draft.userId,
            athleteId: draft.athleteId,
            provider: draft.provider.value,
            model: draft.model,
            status: draft.status.value,
            weeks: draft.weeks,
            trainingDays: [...draft.trainingDays],
            goal: draft.goal,
            content: draft.proposal,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
        }
    },

    /** The aggregate's message order is the thread's order, so it is what gets stored. */
    messagesToPersistence(draft: AiMesocycleDraftAggregate): (typeof aiMesocycleDraftMessages.$inferInsert)[] {
        return draft.messages.map((message, position) => ({
            id: message.id,
            draftId: draft.id,
            position,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        }))
    },
}
